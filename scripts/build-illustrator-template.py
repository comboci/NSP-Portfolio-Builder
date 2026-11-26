"""Convert the PDF-compatible Illustrator master to editable NSP objects.

Offline document conversion only. Does not launch the application or touch its
storage. Requires bundled pypdfium2, pypdf, Pillow and reportlab.
"""
from pathlib import Path
import argparse, base64, collections, ctypes as C, hashlib, io, json, math, re, zipfile
import pypdfium2 as pdfium
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'deliverables' / 'NSP-Portfolio-Editable-Master'
RAW = pdfium.raw

def num(n):
    return round(float(n), 6)

def matrix(o):
    m = o.get_matrix()
    return m.a, m.b, m.c, m.d, m.e, m.f

def rgba(o, stroke=False):
    values = [C.c_uint() for _ in range(4)]
    fn = RAW.FPDFPageObj_GetStrokeColor if stroke else RAW.FPDFPageObj_GetFillColor
    assert fn(o, *values)
    r,g,b,a = [v.value for v in values]
    return '#%02x%02x%02x' % (r,g,b), a/255

def segments(count, get, transform):
    result = []
    pending = []
    for i in range(count):
        seg = get(i)
        x,y = C.c_float(), C.c_float()
        assert RAW.FPDFPathSegment_GetPoint(seg, x, y)
        point = tuple(num(n) for n in transform(x.value,y.value))
        typ = RAW.FPDFPathSegment_GetType(seg)
        if typ == RAW.FPDF_SEGMENT_BEZIERTO:
            pending.extend(point)
            if len(pending) == 6:
                result.append(['C', *pending]); pending=[]
        else:
            assert not pending
            result.append(['M' if typ == RAW.FPDF_SEGMENT_MOVETO else 'L', *point])
        if RAW.FPDFPathSegment_GetClose(seg):
            result.append(['Z'])
    assert not pending
    return result

def dstring(commands):
    return ' '.join(c[0]+' '.join(str(num(x)) for x in c[1:]) for c in commands)

def clip_paths(o):
    cp=RAW.FPDFPageObj_GetClipPath(o)
    if not cp:return []
    paths=[]
    for i in range(RAW.FPDFClipPath_CountPaths(cp)):
        n=RAW.FPDFClipPath_CountPathSegments(cp,i)
        if n>0:
            paths.append(segments(n,lambda j:RAW.FPDFClipPath_GetPathSegment(cp,i,j),lambda x,y:(x,y)))
    return paths

def visible_bounds(o,page):
    w,h=page.get_size()
    l,b,r,t=o.get_bounds()
    for path in clip_paths(o):
        pts=[(c[j],c[j+1]) for c in path for j in range(1,len(c),2)]
        if pts:
            l=max(l,min(x for x,y in pts));r=min(r,max(x for x,y in pts))
            b=max(b,min(y for x,y in pts));t=min(t,max(y for x,y in pts))
    return max(0,l),max(0,b),min(w,r),min(h,t)

def relative_clips(o,bounds):
    l,b,r,t=bounds
    return [{'d':dstring([[c[0],*[v for j in range(1,len(c),2) for v in ((c[j]-l)/(r-l),(t-c[j+1])/(t-b))]] for c in path]),'rule':'nonzero'} for path in clip_paths(o)]

def font_library(reader):
    result={}
    for page in reader.pages:
        for f in page['/Resources']['/Font'].values():
            f=f.get_object()
            if '/DescendantFonts' in f:continue
            fd=f.get('/FontDescriptor')
            if not fd or '/FontFile2' not in fd:continue
            name=str(f['/BaseFont']).lstrip('/')
            data=fd['/FontFile2'].get_data()
            # Keep the exact embedded font program; no system substitution.
            result[name]=data
    return result

def region(page_no,o):
    x,y,w,h=o['x'],o['y'],o['w'],o['h']
    cx,cy=x+w/2,y+h/2
    if page_no==1:
        if x>510:return 'collage','کلاژ عکس‌های جلد'
        if y+h<125:return 'brand','نشان و نام شرکت'
        if 545<y and y+h<690:
            i=min(3,max(0,int(cx/125)))
            return f'service-{i+1}',['GRMS','IPTV','Integration','Energy Saving'][i]
        if y>755:return 'footer','نشانی وب و خط پایانی'
        return 'title','عنوان و معرفی جلد'
    if page_no==2:
        if y+h<150:return 'heading','عنوان صفحه'
        if y>785:return 'footer','شماره صفحه'
        if x>630 and y>590:return 'map','نقشه و کشورها'
        if x>445 and y<580:
            col=min(2,max(0,int((cx-445)/215)))
            row=0 if cy<370 else 1
            return f'service-{row*3+col+1}',['GRMS','IPTV','Energy Saving','Integration','Engineering','Support'][row*3+col]
        if y>640 and x<630:return 'stats','آمار و سابقه'
        return 'intro','معرفی شرکت'
    if page_no in [3,4]:
        if y+h<150:return 'heading','عنوان صفحه'
        if y>785:return 'footer','شماره صفحه'
        if page_no==4:
            if x<570:return 'hotel-photo','عکس هتل پارسیان آزادی'
            return 'hotel-detail','اطلاعات و امکانات هتل'
        if y>590:return 'services','فهرست خدمات'
        return 'features','معرفی راهکارها'
    if y+h<160:return 'heading','عنوان صفحه'
    if y>785:return 'footer','شماره صفحه'
    col=0 if cx<600 else 1;row=0 if cy<440 else 1
    return f'hotel-{row*2+col+1}',f'کارت هتل {row*2+col+1}'

def convert(source):
    OUT.mkdir(parents=True,exist_ok=True)
    images=OUT/'Image';images.mkdir(exist_ok=True)
    fonts_dir=OUT/'Reference'/'Fonts';fonts_dir.mkdir(parents=True,exist_ok=True)
    doc=pdfium.PdfDocument(source); reader=PdfReader(source)
    fonts=font_library(reader)
    regular_names={n.split('+')[-1]:n for n in fonts}
    assets=[];image_hashes={};pages=[];font_used={};stats=[]
    for i,page in enumerate(doc):
        pw,ph=page.get_size();sx,sy=1191/pw,842/ph
        pid=f'nsp-illustrator-page-{i+1:02}'
        tp=page.get_textpage();chars=collections.defaultdict(list)
        for ci in range(tp.count_chars()):
            obj=RAW.FPDFText_GetTextObject(tp,ci)
            if not obj:continue
            code=RAW.FPDFText_GetUnicode(tp,ci)
            if code in [0,10,13]:continue
            x,y=C.c_double(),C.c_double()
            if RAW.FPDFText_GetCharOrigin(tp,ci,x,y):chars[C.cast(obj,C.c_void_p).value].append((chr(code),x.value,y.value))
        objects=[];skipped=[]
        for j,o in enumerate(page.get_objects(textpage=tp)):
            l,b,r,t=visible_bounds(o,page)
            if r-l<0.0001 or t-b<0.0001:
                skipped.append(j);continue
            if o.type==RAW.FPDF_PAGEOBJ_TEXT:
                # Give changed text a real line box, while positioned glyphs keep
                # their original absolute baselines in the initial design.
                tm=matrix(o);em=abs(tm[3]*o.get_font_size())
                b=max(0,min(b,tm[5]-.22*em));t=min(ph,max(t,tm[5]+.82*em))
            # A minimum one-pixel box agrees with the existing scene geometry.
            x,y=l*sx,(ph-t)*sy;w,h=max(1,(r-l)*sx),max(1,(t-b)*sy)
            x=min(x,1191-w);y=min(y,842-h)
            bounds=(x/sx,ph-(y+h)/sy,(x+w)/sx,ph-y/sy)
            l,b,r,t=bounds
            obj={'id':f'{pid}-obj-{j:03}','x':num(x),'y':num(y),'w':num(w),'h':num(h),'text':'','fontSize':12,'color':'#152638','colorSource':'custom','background':'transparent','visible':True,'locked':False,'layerOrigin':'page','layerOwnerId':pid,'illustratorSource':{'page':i+1,'object':j}}
            a,bb,c,dd,e,f=matrix(o)
            clips=relative_clips(o,bounds)
            if clips:obj['vectorClips']=clips
            if o.type==RAW.FPDF_PAGEOBJ_PATH:
                fill,stroke=C.c_int(),C.c_int();RAW.FPDFPath_GetDrawMode(o,fill,stroke)
                if not fill.value and not stroke.value:continue
                commands=segments(RAW.FPDFPath_CountSegments(o),lambda k:RAW.FPDFPath_GetPathSegment(o,k),lambda xx,yy:((a*xx+c*yy+e-l)*sx,(t-(bb*xx+dd*yy+f))*sy))
                fc,fa=rgba(o);sc,sa=rgba(o,True);sw=C.c_float();RAW.FPDFPageObj_GetStrokeWidth(o,sw)
                dash_count=RAW.FPDFPageObj_GetDashCount(o);dash=(C.c_float*max(1,dash_count))();phase=C.c_float()
                if dash_count:RAW.FPDFPageObj_GetDashArray(o,dash,dash_count)
                RAW.FPDFPageObj_GetDashPhase(o,phase)
                # Source paths use rigid unit matrices. Reject silent affine loss.
                assert abs(a-1)<0.00001 and abs(dd-1)<0.00001 and abs(bb)<0.00001 and abs(c)<0.00001,(i,j,matrix(o))
                obj.update(type='vectorPath',name=f'مسیر برداری {j+1}',pathData=dstring(commands),pathWidth=num(w),pathHeight=num(h),pathRule='evenodd' if fill.value==1 else 'nonzero',pathFill=bool(fill.value),pathStroke=bool(stroke.value),background=fc,pathFillOpacity=num(fa),strokeColor=sc,pathStrokeOpacity=num(sa),strokeWidth=num(sw.value*(sx+sy)/2),pathCap=['butt','round','square'][RAW.FPDFPageObj_GetLineCap(o)],pathJoin=['miter','round','bevel'][RAW.FPDFPageObj_GetLineJoin(o)],pathDash=[num(dash[k]*sx) for k in range(dash_count)],pathDashOffset=num(phase.value*sx))
            elif o.type==RAW.FPDF_PAGEOBJ_IMAGE:
                assert abs(bb)<0.00001 and abs(c)<0.00001 and a>0 and dd>0
                bitmap=o.get_bitmap(render=False);image=bitmap.to_pil().copy();bitmap.close()
                data=io.BytesIO();image.save(data,format='PNG');data=data.getvalue();hash_=hashlib.sha256(data).hexdigest()
                if hash_ not in image_hashes:
                    aid=f'nsp-original-photo-{len(assets)+1:02}';name=aid+'.png';(images/name).write_bytes(data)
                    assets.append({'id':aid,'name':f'عکس اصل طراحی {len(assets)+1}','path':'../../Image/'+name,'width':image.width,'height':image.height,'type':'image/png','size':len(data),'createdAt':'2026-11-26T00:00:00Z'})
                    image_hashes[hash_]=aid
                crop={'cropX':num((l-e)/a*100),'cropY':num((f+dd-t)/dd*100),'cropW':num((r-l)/a*100),'cropH':num((t-b)/dd*100)}
                obj.update(type='image',name=f'عکس مستقل {j+1}',assetId=image_hashes[hash_],objectFit='fill',imageEdit=json.dumps(crop))
            elif o.type==RAW.FPDF_PAGEOBJ_TEXT:
                text=o.extract()
                if not text.strip():continue
                name=o.get_font().get_base_name();short=name.split('+')[-1]
                font=fonts.get(name) or fonts.get(regular_names.get(short,''))
                length=C.c_size_t()
                if RAW.FPDFFont_GetFontData(o.get_font(),None,0,length) and length.value:
                    rawfont=(C.c_ubyte*length.value)()
                    if RAW.FPDFFont_GetFontData(o.get_font(),rawfont,length.value,length):
                        exact=bytes(rawfont)
                        if exact in fonts.values():font=exact
                # The CID ligature font is a sparse copy of the same Semibold.
                if short=='SourceSansPro-Semibold':font=fonts[regular_names[short]]
                if font is None and short!='MyriadPro-Regular':raise ValueError('Missing original embedded font: '+name)
                hash_=hashlib.sha256(font).hexdigest()[:12] if font else 'source-outlines';family='NSP-'+short+'-'+hash_
                if font:font_used[family]=font
                glyphs=chars[C.cast(o.raw,C.c_void_p).value]
                fs=o.get_font_size();fc,fa=rgba(o)
                obj.update(type='text',name=text.strip()[:70],text=text,fontSize=num(abs(dd*fs)*sy),fontFamily=family,fontWeight='normal',textAlign='left',direction='ltr',lineHeight=1,verticalAlign='top',color=fc,opacity=num(fa))
                obj['sourceTextLayout']={'text':text,'family':family,'fontSize':obj['fontSize'],'width':num(w),'height':num(h),'matrix':[num(a*fs*sx),num(-bb*fs*sy),num(-c*fs*sx),num(dd*fs*sy)],'glyphs':[{'text':ch,'x':num((xx-l)*sx),'y':num((t-yy)*sy)} for ch,xx,yy in glyphs]}
                if font:obj['sourceTextLayout']['fontData']='data:font/ttf;base64,'+base64.b64encode(font).decode()
                for g in obj['sourceTextLayout']['glyphs']:
                    if g['text'].isspace():continue
                    gp=RAW.FPDFFont_GetGlyphPath(o.get_font(),ord(g['text']),1.0)
                    if gp and RAW.FPDFGlyphPath_CountGlyphSegments(gp)>0:
                        cmds=segments(RAW.FPDFGlyphPath_CountGlyphSegments(gp),lambda k:RAW.FPDFGlyphPath_GetGlyphPathSegment(gp,k),lambda xx,yy:(xx,-yy))
                        g['d']=dstring(cmds)
                if not glyphs:raise ValueError('No positioned glyphs for '+text)
            else:raise ValueError('Unsupported Illustrator object '+str(o.type))
            key,title=region(i+1,obj);obj['layerId']=key;obj['regionTitle']=title
            objects.append(obj)
        layers=[];blocks=[]
        for key in dict.fromkeys(o['layerId'] for o in objects):
            children=[o for o in objects if o['layerId']==key];title=children[0]['regionTitle'];layers.append({'id':key,'name':title,'visible':True})
            left=min(o['x'] for o in children);top=min(o['y'] for o in children);right=max(o['x']+o['w'] for o in children);bottom=max(o['y']+o['h'] for o in children)
            bid=f'{pid}-region-{key}'
            blocks.append({'id':bid,'type':'block','name':title,'x':left,'y':top,'w':num(right-left),'h':num(bottom-top),'layerId':key,'layerOrigin':'page','layerOwnerId':pid,'blockResizeMode':'proportional','background':'transparent','text':'','fontSize':12,'color':'#152638','visible':True,'locked':False})
            for child in children:child['blockId']=bid;del child['regionTitle']
        objects=blocks+objects
        page_record={'id':pid,'title':['جلد','معرفی شرکت','خدمات و راهکارها','معرفی هتل','کارت‌های پروژه'][i],'body':'','image':'','chartLabels':'','chartValues':'','designMode':'independent','locked':False,'contentLocked':False,'snapshot':None,'layers':layers,'layerOrder':[json.dumps(['page',pid,l['id']],separators=(',',':')) for l in layers],'objectOrder':[json.dumps(['page',pid,o['id']],separators=(',',':')) for o in objects],'visualObjects':objects,'pageStyleOverrides':{'paperSize':'A4','orientation':'landscape','background':'#ffffff','textColor':'#09213d','font':'Tahoma','margin':0,'verticalMargin':0}}
        pages.append(page_record);stats.append({'page':i+1,'objects':dict(collections.Counter(o['type'] for o in objects)),'regions':len(blocks),'skippedInvisibleOrEmpty':skipped})
    for family,data in font_used.items():(fonts_dir/(family+'.ttf')).write_bytes(data)
    templates=[]
    for i,p in enumerate(pages):
        tid=f'nsp-illustrator-template-{i+1:02}';p['pageTemplateId']=tid
        templates.append({'id':tid,'name':f'NSP اصل Illustrator — {p["title"]}','categoryId':'nsp-illustrator-masters','objects':json.loads(json.dumps(p['visualObjects'])),'layers':p['layers'],'style':p['pageStyleOverrides']})
    # Shared immutable source photos make the five masters immediately reusable
    # from the page-template library, including in a different project.
    data={'designModel':'page-first','title':'NSP Portfolio','schemaVersion':2,'templates':[],'imageLibrary':[],'imageAlbums':[],'customComponents':[],'portfolios':[{'id':'nsp-illustrator-portfolio','name':'NSP Portfolio','title':'NSP Portfolio','pages':pages}],'activePortfolioId':'nsp-illustrator-portfolio'}
    payload={'app':'NSP Portfolio Builder','kind':'NSP-Project-Backup','schemaVersion':2,'appVersion':269,'project':{'name':'NSP Portfolio','data':data},'templates':templates,'templateCategories':[{'id':'nsp-illustrator-masters','name':'NSP — اصل طراحی Illustrator','parentId':None}],'styleLibrary':[],'publicImages':assets,'manifest':{'format':'NSP-Repository-Project','version':1,'relativeImageRoot':'../../Image/','pageCount':5,'imageCount':len(assets),'requiredCapabilities':['illustrator-vector-path-v1','illustrator-positioned-text-v1','illustrator-vector-clip-v1'],'sourceFile':'Rezome nsp 4.ai','sourceSHA256':hashlib.sha256(Path(source).read_bytes()).hexdigest()}}
    project_dir=OUT/'project file'/'NSP-Portfolio';project_dir.mkdir(parents=True,exist_ok=True)
    (project_dir/'project.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    report={'status':'DOCUMENT_CONVERSION_ONLY_RUNTIME_REVIEW_BY_OWNER','source':str(source),'pages':stats,'assetCount':len(assets),'fontCount':len(font_used),'noRasterBackgrounds':True,'runtimeExecuted':False}
    (OUT/'conversion-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(report,ensure_ascii=True,indent=2))
    return payload

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('source');args=ap.parse_args();convert(Path(args.source))
