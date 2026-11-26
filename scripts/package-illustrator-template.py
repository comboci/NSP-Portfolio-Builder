"""Package the verified document artifacts; does not run the builder."""
from pathlib import Path
import hashlib,json,zipfile,os
ROOT=Path(__file__).resolve().parents[1]
VARIANT=os.environ.get('NSP_TEMPLATE_VARIANT','NSP-Portfolio-Editable-Master')
OUT=ROOT/'deliverables'/VARIANT
guide=(ROOT/'docs'/'ILLUSTRATOR_EDITABLE_MASTER_FA.md').read_text(encoding='utf8')
(OUT/'README-FA.md').write_text(guide,encoding='utf8')
update=OUT/'Builder-Update';update.mkdir(exist_ok=True)
(update/'index.html').write_bytes((ROOT/'index.html').read_bytes())
(update/'README-FA.txt').write_text('فقط در صورت انتقال به یک نسخهٔ دیگر، این index.html را جایگزین فایل ریشهٔ نرم‌افزار کنید.\nدر همین مخزن فایل ریشه از قبل اصلاح شده است. فایل را داخل پوشهٔ Builder-Update اجرا نکنید.\nبرنامهٔ ویندوزی Build نشده؛ بررسی اجرا و چاپ بر عهدهٔ مالک است.\n',encoding='utf8')
transport=ROOT/'deliverables'/(VARIANT+'-transport-validation.json')
if transport.exists():(OUT/'transport-validation.json').write_bytes(transport.read_bytes())
files=[*OUT.glob('project file/*/project.json'),*OUT.glob('Image/*'),*OUT.glob('Builder-Update/*'),OUT/'README-FA.md',OUT/'conversion-report.json',OUT/'static-validation.json',*OUT.glob('transport-validation.json'),*OUT.glob('SCALE-FIX-FA.txt'),*OUT.glob('Preview/*.png')]
archive=ROOT/'deliverables'/(VARIANT+'.zip')
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_STORED) as z:
    for p in sorted(files):z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert len([n for n in z.namelist() if n.endswith('/project.json')])==1
    assert all(e.file_size<24*1024*1024 for e in z.infolist())
    assert sum(e.file_size for e in z.infolist())<80*1024*1024
assert archive.stat().st_size<64*1024*1024
report={'archive':archive.name,'bytes':archive.stat().st_size,'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'files':len(files),'crc':'PASS','appRuntimeExecuted':False}
(ROOT/'deliverables'/(VARIANT+'-zip-validation.json')).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
