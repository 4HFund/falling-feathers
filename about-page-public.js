(() => {
  const CLOUD_NAME='ixfa510d';
  const API_BASE=(window.FFH_CONFIG?.apiBase||'').replace(/\/$/,'');
  const imageUrl=(photo,width=1100)=>`https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,w_${width},h_${Math.round(width*.75)}/${photo.public_id}.${photo.format}`;

  async function applyPhotos(){
    if(!API_BASE)return;
    try{
      const response=await fetch(`${API_BASE}/gallery`);if(!response.ok)return;
      const data=await response.json();const photos=Array.isArray(data.resources)?data.resources:[];
      document.querySelectorAll('[data-about-slot]').forEach(container=>{
        const slot=container.dataset.aboutSlot;
        const photo=photos.find(item=>Array.isArray(item.tags)&&item.tags.includes(`about-${slot}`));
        if(!photo)return;
        const img=document.createElement('img');img.src=imageUrl(photo);img.alt=container.dataset.aboutAlt||'Falling Feathers Hollow';img.loading=slot==='hero'?'eager':'lazy';container.replaceChildren(img);container.classList.add('has-photo');
      });
    }catch(error){console.warn('About page photos could not be loaded.',error);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPhotos);else applyPhotos();
})();
