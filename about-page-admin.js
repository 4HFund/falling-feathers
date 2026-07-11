(() => {
  const CLOUD_NAME='ixfa510d';
  const UPLOAD_PRESET='ml_default';
  const API_BASE=(window.FFH_CONFIG?.apiBase||'').replace(/\/$/,'');
  const slots=[
    {key:'hero',label:'Hero Photo',icon:'🌄',note:'Large photo at the top of the About page'},
    {key:'jacy',label:'Meet Jacy Portrait',icon:'🇺🇸',note:'Main portrait beside Jacy’s story'},
    {key:'family',label:'Family & Service Photo',icon:'👨‍👩‍👧‍👦',note:'Photo representing family, faith, or military service'},
    {key:'animals',label:'Animal Care Photo',icon:'🐾',note:'Photo of Jacy caring for the animals'}
  ];
  let current={};

  const imageUrl=(photo,width=800)=>`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width*.75)}/${photo.public_id}.${photo.format}`;

  function addStyles(){
    const style=document.createElement('style');
    style.textContent=`
      .about-manager-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem}.about-manager-card{background:#fff;border:1px solid var(--line);border-radius:18px;overflow:hidden;box-shadow:0 8px 24px rgba(75,59,42,.06)}.about-manager-preview{aspect-ratio:4/3;display:grid;place-items:center;background:linear-gradient(135deg,#fff6e5,#e7d1ad);font-size:3rem;overflow:hidden}.about-manager-preview img{width:100%;height:100%;object-fit:cover;display:block}.about-manager-body{padding:.85rem}.about-manager-body strong,.about-manager-body small{display:block}.about-manager-body small{color:var(--muted);line-height:1.4;margin:.25rem 0 .7rem}.about-manager-button{width:100%;border:0;border-radius:12px;padding:.75rem;font-weight:900;background:linear-gradient(135deg,var(--green2),var(--green));color:#fff}@media(min-width:760px){.about-manager-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function createPanel(){
    const panel=document.createElement('section');panel.className='panel';panel.id='about-page-manager';
    panel.innerHTML=`<div class="section-title"><h2>About Page Pictures</h2><span>Meet Jacy</span></div><p style="line-height:1.55;margin-top:0">Control the four main photos on the About Us page. Each button opens your camera or photo library.</p><div class="about-manager-grid" id="about-manager-grid"></div><div class="result" id="about-manager-message" aria-live="polite"></div>`;
    const flock=document.getElementById('flock-image-controls');
    if(flock) flock.after(panel); else document.getElementById('photo-manager-mount')?.before(panel);
  }

  function message(text,type='success'){const el=document.getElementById('about-manager-message');el.textContent=text;el.className=`result show ${type}`;}

  async function loadCurrent(){
    if(!API_BASE)return{};
    const response=await fetch(`${API_BASE}/gallery`);if(!response.ok)return{};
    const data=await response.json();const photos=Array.isArray(data.resources)?data.resources:[];const found={};
    slots.forEach(slot=>{found[slot.key]=photos.find(photo=>Array.isArray(photo.tags)&&photo.tags.includes(`about-${slot.key}`))||null;});
    return found;
  }

  function openUpload(slot){
    const widget=cloudinary.createUploadWidget({cloudName:CLOUD_NAME,uploadPreset:UPLOAD_PRESET,multiple:false,sources:['local','camera'],resourceType:'image',clientAllowedFormats:['jpg','jpeg','png','webp','heic'],maxFileSize:12000000,folder:`falling-feathers/about/${slot.key}`,tags:['website-gallery',`about-${slot.key}`,'about-page'],context:{title:slot.label,description:slot.note},showAdvancedOptions:false,cropping:true,croppingAspectRatio:4/3,croppingShowDimensions:true},(error,result)=>{
      if(error){message(`Upload failed: ${error.message||'Unknown error'}`,'error');return;}
      if(result?.event==='success'){
        current[slot.key]={public_id:result.info.public_id,format:result.info.format||'jpg'};
        const card=document.querySelector(`[data-about-admin-slot="${slot.key}"]`);
        card.querySelector('.about-manager-preview').innerHTML=`<img src="${result.info.secure_url}" alt="${slot.label}">`;
        card.querySelector('small').textContent='Custom picture selected';
        message(`${slot.label} updated on the About page.`);
      }
    });
    widget.open();
  }

  function render(){
    const grid=document.getElementById('about-manager-grid');grid.replaceChildren();
    slots.forEach(slot=>{const photo=current[slot.key];const card=document.createElement('article');card.className='about-manager-card';card.dataset.aboutAdminSlot=slot.key;card.innerHTML=`<div class="about-manager-preview">${photo?`<img src="${imageUrl(photo)}" alt="${slot.label}">`:slot.icon}</div><div class="about-manager-body"><strong>${slot.icon} ${slot.label}</strong><small>${photo?'Custom picture selected':slot.note}</small><button class="about-manager-button" type="button">Change Picture</button></div>`;card.querySelector('button').addEventListener('click',()=>openUpload(slot));grid.appendChild(card);});
  }

  async function init(){if(document.getElementById('about-page-manager'))return;addStyles();createPanel();current=await loadCurrent().catch(()=>({}));render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
