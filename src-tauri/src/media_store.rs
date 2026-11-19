use base64::{engine::general_purpose::STANDARD, Engine};
use rusqlite::{params, Transaction};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{fs, io::Write, path::Path};
fn error(e: impl std::fmt::Display)->String {e.to_string()}
fn store_file(tx:&Transaction,root:&Path,source:&str)->Result<String,String>{
    let (header,data)=source.split_once(",").ok_or("Invalid image data URL")?;
    let (mime,ext)=match header.to_ascii_lowercase().as_str() {
        "data:image/png;base64"=>("image/png","png"),
        "data:image/jpeg;base64"=>("image/jpeg","jpg"),
        "data:image/webp;base64"=>("image/webp","webp"),
        "data:image/gif;base64"=>("image/gif","gif"),
        _=>return Err("Unsupported image type".into())
    };
    let bytes=STANDARD.decode(data).map_err(error)?;
    let valid=match ext {"png"=>bytes.starts_with(b"\x89PNG\r\n\x1a\n"),"jpg"=>bytes.starts_with(&[0xff,0xd8,0xff]),"gif"=>bytes.starts_with(b"GIF87a")||bytes.starts_with(b"GIF89a"),"webp"=>bytes.starts_with(b"RIFF")&&bytes.get(8..12)==Some(b"WEBP".as_slice()),_=>false};
    if !valid{return Err("Image signature does not match MIME type".into());}
    let hash=format!("{:x}",Sha256::digest(&bytes));
    let relative=format!("assets/{hash}.{ext}");let path=root.join(&relative);
    // Only content-derived filenames are accepted. Original user paths never cross IPC.
    if path.exists(){if fs::read(&path).map_err(error)?!=bytes{return Err("Asset integrity mismatch".into());}}
    else {let tmp=root.join(format!("assets/{hash}.pending"));let mut f=fs::File::create(&tmp).map_err(error)?;f.write_all(&bytes).map_err(error)?;f.sync_all().map_err(error)?;drop(f);fs::rename(&tmp,&path).map_err(error)?;}
    tx.execute("INSERT OR IGNORE INTO asset_files(hash,mime,relative_path,byte_length) VALUES(?1,?2,?3,?4)",params![hash,mime,relative,bytes.len() as i64]).map_err(error)?;Ok(hash)
}
pub fn persist_images(tx:&Transaction,root:&Path,v:&Value)->Result<(),String>{
    if let Some(images)=v["imageLibrary"].as_array(){for a in images {
        let id=a["id"].as_str().ok_or("Missing image ID")?;
        let original=store_file(tx,root,a["src"].as_str().ok_or("Missing original image")?)?;
        let thumbnail=match a["thumbnail"].as_str(){Some(s)=>Some(store_file(tx,root,s)?),None=>None};
        tx.execute("INSERT INTO image_files(project_id,image_id,original_hash,thumbnail_hash) VALUES('workspace',?1,?2,?3)",params![id,original,thumbnail]).map_err(error)?;
    }}Ok(())
}
fn entity(tx:&Transaction,kind:&str,id:&str)->Result<(),String>{tx.execute("INSERT OR IGNORE INTO scene_entities VALUES('workspace',?1,?2)",params![kind,id]).map_err(error)?;Ok(())}
fn link(tx:&Transaction,fk:&str,fi:&str,rel:&str,tk:&str,ti:&str)->Result<(),String>{
    if ti.is_empty()||ti=="none"||ti=="master"{return Ok(());}
    // Legacy optional targets remain in the lossless payload; only existing targets form edges.
    tx.execute("INSERT OR IGNORE INTO scene_links SELECT 'workspace',?1,?2,?3,?4,?5 WHERE EXISTS(SELECT 1 FROM scene_entities WHERE project_id='workspace' AND kind=?4 AND id=?5)",params![fk,fi,rel,tk,ti]).map_err(error)?;Ok(())
}
pub fn project_links(tx:&Transaction,v:&Value)->Result<(),String>{
    for kind in ["masterTemplates","sectionDesigns","templates"]{if let Some(items)=v[kind].as_array(){for a in items{entity(tx,kind,a["id"].as_str().ok_or("Missing template ID")?)?;}}}
    if let Some(portfolios)=v["portfolios"].as_array(){for p in portfolios{let pid=p["id"].as_str().ok_or("Missing portfolio ID")?;entity(tx,"portfolio",pid)?;if let Some(pages)=p["pages"].as_array(){for page in pages{let id=format!("{pid}/{}",page["id"].as_str().ok_or("Missing page ID")?);entity(tx,"page",&id)?;link(tx,"page",&id,"portfolio","portfolio",pid)?;for (field,target) in [("masterTemplateId","masterTemplates"),("sectionDesignId","sectionDesigns"),("templateId","templates")]{if let Some(to)=page[field].as_str(){link(tx,"page",&id,field,target,to)?;}}}}}}
    for kind in ["masterTemplates","sectionDesigns","templates"]{if let Some(items)=v[kind].as_array(){for a in items{let id=a["id"].as_str().ok_or("Missing template ID")?;for field in ["parentMasterId","masterTemplateId","masterId"]{if let Some(to)=a[field].as_str(){link(tx,kind,id,field,"masterTemplates",to)?;}}}}}Ok(())
}
