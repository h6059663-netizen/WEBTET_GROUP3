const ADMIN_EMAILS = [
  "group3-12a1@gmail.com"
];

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc, 
  increment,
  arrayUnion,
  arrayRemove,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js";

/* ===== FIREBASE INIT (THÊM MỚI) ===== */
const firebaseConfig = {
  apiKey: "AIzaSyDsNB3G_JSO6r7oCliOwHvEwq_KiICf9DI",
  authDomain: "tet-demo-a9c31.firebaseapp.com",
  projectId: "tet-demo-a9c31",
  storageBucket: "tet-demo-a9c31.firebasestorage.app",
  messagingSenderId: "338333459092",
  appId: "1:338333459092:web:ca2410c1604c296243ca81"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth=getAuth(app);
const provider=new GoogleAuthProvider();
let currentUser=null;
let isAdmin=false;


/* ================= GLOBAL ================= */
let postCounter = 0;
let currentPost = null;



/* ================= PAGE ================= */
function showPage(pageId){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const page=document.getElementById(pageId);
  if(page) page.classList.add('active');

  if(pageId==="reel"){
    loadReels();
  }
}


function goHome(){
  showPage('home');
  setActiveMenu(0);
}

function setActiveMenu(index){
  const items=document.querySelectorAll('.menu-item');
  items.forEach(item=>item.classList.remove('active'));
  if(items[index]) items[index].classList.add('active');
}


/* ================= REEL ================= */
const observer=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{
    const iframe=entry.target.querySelector("iframe");
    if(!iframe) return;

    if(entry.isIntersecting){

  // mute toàn bộ video khác
  document.querySelectorAll(".reel iframe").forEach(f=>{
    f.contentWindow.postMessage(
      '{"event":"command","func":"mute","args":""}',
      '*'
    );
  });

  // play + bật tiếng video hiện tại
  iframe.contentWindow.postMessage(
    '{"event":"command","func":"playVideo","args":""}',
    '*'
  );

  iframe.contentWindow.postMessage(
    '{"event":"command","func":"unMute","args":""}',
    '*'
  );

}else{

  iframe.contentWindow.postMessage(
    '{"event":"command","func":"pauseVideo","args":""}',
    '*'
  );

}
  });
},{threshold:0.7});

/* ================= MODAL CREATE ================= */
function openModal(){
  document.getElementById("createModal").style.display="flex";
}

function handleCreateClick(){

  if(!currentUser){
    openAuth("admin");
    return;
  }

  if(!isAdmin){
    alert("Chỉ admin được đăng bài");
    return;
  }

  openModal();
}

window.handleCreateClick = handleCreateClick;

function closeModal(){
  document.getElementById("createModal").style.display="none";
}
function loadReels(){

  const feed=document.getElementById("reelFeed");
  if(!feed) return;

  if(feed.dataset.loaded) return;

  const reelVideos=["0a5cN7QbjPw","WctNaJ8eVU4","WZniV_YJdDg","t3hT1wiYJL0","7muntW1jTSo","TPPNz4nGQAA","PPY9dOh0MSo","BtokXHbWkws","TrPk-_UbvPw","tt3fMjlMUgQ"];

  reelVideos.forEach(id=>{
    feed.insertAdjacentHTML("beforeend",`
      <div class="reel">
        <iframe
          src="https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&playsinline=1"
          allow="autoplay; encrypted-media"
          allowfullscreen></iframe>
        <div class="reel-gradient"></div>
      </div>
    `);
  });

  document.querySelectorAll(".reel").forEach(r=>observer.observe(r));

  document.addEventListener("click", e => {

  const reel = e.target.closest(".reel");
  if(!reel) return;

  const iframe = reel.querySelector("iframe");
  if(!iframe) return;

  // bật tiếng
  iframe.contentWindow.postMessage(
    '{"event":"command","func":"unMute","args":""}',
    "*"
  );

  // đảm bảo video đang play
  iframe.contentWindow.postMessage(
    '{"event":"command","func":"playVideo","args":""}',
    "*"
  );

});

  feed.dataset.loaded=true;
}


/* ================= PREVIEW IMAGE ================= */
document.addEventListener("change",e=>{
  if(e.target.id==="imageInput"){
    const box=document.getElementById("previewBox");
    box.innerHTML="";
    const files=[...e.target.files];
    if(!files.length) return;

    files.slice(0,4).forEach((file,i)=>{
      const wrap=document.createElement("div");
      wrap.className="preview-item";

      const img=document.createElement("img");
      img.src=URL.createObjectURL(file);
      wrap.appendChild(img);

      if(i===3 && files.length>4){
        const more=document.createElement("div");
        more.className="preview-more";
        more.innerText="+"+(files.length-4);
        wrap.appendChild(more);
      }
      box.appendChild(wrap);
    });
  }
});


/* ================= LIKE ================= */
function toggleLike(el){
  el.classList.toggle("liked");
  const num=el.querySelector("span");
  let count=parseInt(num.innerText)||0;
  count=el.classList.contains("liked")?count+1:count-1;
  num.innerText=count;
}


/* ================= SHARE ================= */
function copyPostLink(el){
  navigator.clipboard.writeText(window.location.href).then(()=>{
    const old=el.innerHTML;
    el.innerHTML="Đã copy ✔";
    setTimeout(()=>{
      el.innerHTML=old;
      lucide.createIcons();
    },1200);
  });
}


/* ================= COMMENT ================= */
async function openCommentFromBtn(btn){

  const post = btn.closest(".post-card");
  currentPost = post.dataset.id;

  document.getElementById("commentModal").style.display="flex";

  const list = document.getElementById("commentList");
  list.innerHTML="Đang tải...";

  try{

    const snap = await getDocs(query(collection(db,"posts")));
    
    const docSnap = snap.docs.find(d=>d.id===currentPost);
    if(!docSnap){
      list.innerHTML="Không tìm thấy bài";
      return;
    }

    const data = docSnap.data();
    const comments = data.comments || [];

    if(!comments.length){
      list.innerHTML="<i>Chưa có bình luận</i>";
      return;
    }

    list.innerHTML="";

    comments
      .sort((a,b)=>a.time-b.time)
      .forEach(c=>{
        list.insertAdjacentHTML("beforeend",`
  <div class="comment-item">
    <div class="c-body">
      <b>${c.user}</b> ${c.text}
    </div>

    ${isAdmin || c.user === (currentUser?.displayName || currentUser?.email)
      ? `<span class="c-del" onclick="deleteComment(${c.time})">✕</span>`
      : ""
    }
  </div>
`);

      });

  }catch(err){
    console.error(err);
    list.innerHTML="Lỗi tải comment";
  }
}


function closeComment(){
  document.getElementById("commentModal").style.display="none";
}


/*==Created post==*/

async function createPost(){

  const caption=document.getElementById("captionInput").value;
  const files=[...document.getElementById("imageInput").files];

  if(!files.length && !window.editingPostId){
  alert("Chọn ít nhất 1 ảnh");
  return;
}


  postCounter++;
  const id=postCounter;

  let imagesHTML="";

if(files.length===1){

  imagesHTML=`
  <div class="post-image">
    <img src="${URL.createObjectURL(files[0])}">
  </div>`;

}else{

  let slides="";
  let dots="";

  files.forEach((f,i)=>{
    slides+=`<img src="${URL.createObjectURL(f)}">`;
    dots+=`<span class="${i===0?"active":""}"></span>`;
  });

  imagesHTML=`
<div class="post-carousel" data-index="0">

  <div class="carousel-track">
    ${slides}
  </div>

  <div class="carousel-arrow left" onclick="slidePost(this,-1)">‹</div>
  <div class="carousel-arrow right" onclick="slidePost(this,1)">›</div>

  <div class="carousel-dots">
    ${dots}
  </div>

  <div class="carousel-count">1/${files.length}</div>

</div>`;

}


  /* ===== HIỂN THỊ TRÊN WEB ===== */
  const html=`
  <div class="post-card" data-post="${id}">
    <div class="post-header">
      <img src="https://i.ibb.co/pvFN0yZX/z7525960835881-251907a56c25d2989a4109022ddc6935.jpg" class="avatar">
      <div><h4>Nhóm 3</h4><span>Vừa xong</span></div>
    </div>

    <p>${caption}</p>
    ${imagesHTML}

    <div class="post-actions-bar">
      <div class="left-actions">

        <div class="action like" onclick="toggleLike(this)">
          <i data-lucide="heart"></i>
          <span>0</span>
        </div>

        <div class="action" onclick="openCommentFromBtn(this)">
          <i data-lucide="message-circle"></i>
          <span>0</span>
        </div>

        <div class="action" onclick="copyPostLink(this)">
          <i data-lucide="send"></i>
        </div>

      </div>
    </div>

  </div>
  `;

  document.getElementById("home")
    .insertAdjacentHTML("afterbegin",html);
    const newPost = document.getElementById("home").firstElementChild;
const carousel = newPost.querySelector(".post-carousel");
if(carousel) fixCarouselHeight(carousel);

  lucide.createIcons();


/* ===== LƯU FIREBASE + UPLOAD ẢNH ===== */
try{

  const urls=[];     // ảnh mới
  const paths=[];    // path mới

  const selected = files.slice(0,10);

  // upload ảnh mới
  const bar = document.getElementById("uploadBar");
bar.parentElement.style.display="block";
bar.style.width="0%";

let uploaded = 0;
const total = selected.length;

for(const file of selected){

  const path = "posts/" + Date.now() + "_" + file.name;
  const storageRef = ref(storage,path);

  await uploadBytes(storageRef,file);
  const url = await getDownloadURL(storageRef);

  urls.push(url);
  paths.push(path);

  uploaded++;
  bar.style.width = (uploaded/total*100) + "%";
}

  // ===== EDIT MODE =====
  if(window.editingPostId){

    const finalImages = [
      ...(window.oldImages || []),
      ...urls
    ];

    const finalPaths = [
      ...(window.oldPaths || []),
      ...paths
    ];

    await updateDoc(doc(db,"posts",window.editingPostId),{
      caption: caption,
      images: finalImages,
      paths: finalPaths
    });

    window.editingPostId=null;
    window.oldImages=null;
    window.oldPaths=null;

    loadPosts();
    closeModal();
    return;
  }

  // ===== NEW POST =====
  await addDoc(collection(db,"posts"),{
    caption:caption,
    images:urls,
    paths:paths,
    createdAt:Date.now(),
    user:"Nhóm 3",
    likes:0,
    comments:[],
    likesCount:0,
    likedBy:[]
  });

  console.log("Đã lưu nhiều ảnh");

}catch(err){
  console.error(err);
  alert("lỗi");
}

window.editingPostId=null;
window.oldImages=null;
window.oldPaths=null;


  /* ===== RESET FORM ===== */
  document.getElementById("captionInput").value="";
  document.getElementById("imageInput").value="";
  document.getElementById("previewBox").innerHTML="";
  closeModal();

  bar.style.width="0%";
bar.parentElement.style.display="none";
}


function openProfileTab(tab,el){

  // Ẩn tất cả section
  document.querySelectorAll(".profile-section").forEach(s=>{
    s.style.display="none";
  });

  // bỏ active tất cả tab
  document.querySelectorAll(".profile-tab").forEach(t=>{
    t.classList.remove("active");
  });

  // bật tab đang bấm
  el.classList.add("active");

  // hiện section tương ứng
  if(tab==="photos"){
    document.getElementById("photosTab").style.display="block";
    loadProfilePhotos();
  }

  if(tab==="members"){
    document.getElementById("membersTab").style.display="block";
  }
}
function openMemberProfile(name,role,img){

  document.getElementById("mpName").innerText=name;
  document.getElementById("mpRole").innerText=role;
  document.getElementById("mpAvatar").src=img;

  showPage("memberProfile");
}

// 👇 expose functions cho HTML onclick dùng được
window.showPage = showPage;
window.goHome = goHome;
window.setActiveMenu = setActiveMenu;
window.openModal = openModal;
window.closeModal = closeModal;
window.createPost = createPost;
window.toggleLike = toggleLike;
window.openCommentFromBtn = openCommentFromBtn;
window.copyPostLink = copyPostLink;
window.closeComment = closeComment;
window.addComment = addComment;
window.openProfileTab = openProfileTab;

/*---LOAD BÀI---*/
async function loadPosts(){

  const home=document.getElementById("home");
  home.innerHTML="";   // clear feed

  const q=query(collection(db,"posts"),orderBy("createdAt","desc"));
  const snap=await getDocs(q);

  snap.forEach(doc=>{

    const data=doc.data();
    const docId=doc.id;

    const html=`
    <div class="post-card" data-id="${docId}">
      <div class="post-header">
        <img src="https://i.ibb.co/pvFN0yZX/z7525960835881-251907a56c25d2989a4109022ddc6935.jpg" class="avatar">
        <div><h4>${data.user||"User"}</h4><span>Mới đăng</span></div>
      </div>
      <div class="post-menu">
        <div class="menu-btn" onclick="togglePostMenu(this)">⋯</div>

         <div class="menu-popup">
           <div onclick='editPost("${docId}")'> <i data-lucide="pencil"></i> Sửa bài</div>
             <div onclick='deletePost("${docId}", ${JSON.stringify(data.paths||[])})'>
              <i data-lucide="trash-2"></i> Xoá bài</div>
         </div>
      </div>

      <p>${data.caption||""}</p>

      ${data.images && data.images.length>1 ? `

<div class="post-carousel" data-index="0">

  <div class="carousel-track">
    ${data.images.map(i=>`<img src="${i}">`).join("")}
  </div>

  <div class="carousel-arrow left" onclick="slidePost(this,-1)">‹</div>
  <div class="carousel-arrow right" onclick="slidePost(this,1)">›</div>

  <div class="carousel-dots">
    ${data.images.map((_,i)=>`<span class="${i===0?"active":""}"></span>`).join("")}
  </div>

  <div class="carousel-count">1/${data.images.length}</div>

</div>

`: data.images && data.images.length===1 ? `

<div class="post-image">
  <img src="${data.images[0]}">
</div>

` : ""}


      <div class="post-actions-bar">
        <div class="left-actions">
          <div class="action like ${data.likedBy?.includes(currentUser?.uid) ? "liked" : ""}"
          onclick="likePost(this,'${docId}')">
            <i data-lucide="heart"></i><span>${data.likesCount || 0}</span>
          </div>
          <div class="action" onclick="openCommentFromBtn(this)">
            <i data-lucide="message-circle"></i><span>${data.comments?.length||0}</span>
          </div>
          <div class="action" onclick="copyPostLink(this)">
            <i data-lucide="send"></i>
          </div>
        </div>
      </div>
    </div>
    `;

    home.insertAdjacentHTML("beforeend",html);
  });

  home.querySelectorAll(".post-carousel").forEach(c=>{
  fixCarouselHeight(c);
});

  lucide.createIcons();
}
window.addEventListener("DOMContentLoaded",()=>{
  loadPosts();
});

/*-----XOÁ BÀI-----*/
async function deletePost(id,paths=[]){

  if(!isAdmin){
    alert("Chỉ admin mới có quyền xoá bài");
    return;
  }

  if(!confirm("Xoá bài này?")) return;

  try{

    if(paths && paths.length){
      for(const p of paths){
        const imageRef = ref(storage,p);
        await deleteObject(imageRef);
      }
    }

    await deleteDoc(doc(db,"posts",id));
    loadPosts();

  }catch(err){
    console.error(err);
    alert("Xoá thất bại");
  }
}

window.deletePost = deletePost;

/* ===== CAROUSEL SWIPE ===== */

document.addEventListener("pointerdown",startDrag);
document.addEventListener("pointermove",dragging);
document.addEventListener("pointerup",endDrag);

let startX=0;
let currentCarousel=null;
let hideCounterTimer=null;
let lastTap = 0;

function startDrag(e){
  const carousel=e.target.closest(".post-carousel");
  if(!carousel) return;
  startX=e.clientX;
  currentCarousel=carousel;
}

function dragging(e){
  if(!currentCarousel) return;
}

function endDrag(e){
  if(!currentCarousel) return;

  const diff = e.clientX - startX;
  const track = currentCarousel.querySelector(".carousel-track");
  const images = track.children;
  let index = parseInt(currentCarousel.dataset.index)||0;

  if(Math.abs(diff)>50){
    if(diff<0 && index<images.length-1) index++;
    if(diff>0 && index>0) index--;
  }

  currentCarousel.dataset.index=index;
  track.style.transform=`translateX(-${index*100}%)`;

  const dots=currentCarousel.querySelectorAll(".carousel-dots span");
  dots.forEach(d=>d.classList.remove("active"));
  if(dots[index]) dots[index].classList.add("active");

  /* ===== HIỆN SỐ ẢNH ===== */
  const counter = currentCarousel.querySelector(".carousel-count");
  if(counter){
    counter.innerText = (index+1) + "/" + images.length;
    counter.style.opacity="1";

    clearTimeout(window.hideCounterTimer);
    window.hideCounterTimer = setTimeout(()=>{
      counter.style.opacity="0";
    },1500);
  }

  currentCarousel=null;
}


function slidePost(btn,dir){

  const carousel = btn.closest(".post-carousel");
  const track = carousel.querySelector(".carousel-track");
  const images = track.children;

  let index = parseInt(carousel.dataset.index)||0;
  index += dir;

  if(index<0) index=0;
  if(index>images.length-1) index=images.length-1;

  carousel.dataset.index=index;
  track.style.transform=`translateX(-${index*100}%)`;

  /* ===== HIỆN SỐ ẢNH ===== */
  const counter = carousel.querySelector(".carousel-count");
  if(counter){
    counter.innerText = (index+1) + "/" + images.length;
    counter.style.opacity="1";

    clearTimeout(window.hideCounterTimer);
    window.hideCounterTimer=setTimeout(()=>{
      counter.style.opacity="0";
    },1500);
  }

  const dots=carousel.querySelectorAll(".carousel-dots span");
  dots.forEach(d=>d.classList.remove("active"));
  if(dots[index]) dots[index].classList.add("active");
}

window.slidePost = slidePost;

/* ===== LOAD ẢNH VÀO ALBUM TRANG CÁ NHÂN ===== */

async function loadProfilePhotos(){

  const grid = document.getElementById("profilePhotos");
  if(!grid) return;

  grid.innerHTML="";

  const q=query(collection(db,"posts"),orderBy("createdAt","desc"));
  const snap=await getDocs(q);

  snap.forEach(doc=>{

    const data=doc.data();

    if(data.images && data.images.length){
      data.images.forEach(img=>{
        grid.insertAdjacentHTML("beforeend",`
         <img src="${img}" onclick="openViewer('${img}')">
       `);
      });
    }

  });
}

window.loadProfilePhotos = loadProfilePhotos;

/* ===== VIEW ẢNH TO TỪ ALBUM ===== */

document.getElementById("photoViewer")
?.addEventListener("click",(e)=>{

  // nếu bấm nền tối thì mới đóng
  if(e.target.id==="photoViewer"){
    document.getElementById("photoViewer").style.display="none";
  }

});
window.openViewer = openViewer;

/* ===== VIEWER CAROUSEL ===== */

let viewerImages=[];
let viewerIndex=0;

function openViewer(src){

  const modal=document.getElementById("photoViewer");
  const img=document.getElementById("viewerImg");

  // lấy tất cả ảnh trong album
  viewerImages=[...document.querySelectorAll("#profilePhotos img")]
    .map(i=>i.src);

  viewerIndex=viewerImages.indexOf(src);

  img.src=src;
  modal.style.display="flex";
}

function viewerSlide(dir){

  if(!viewerImages.length) return;

  viewerIndex+=dir;

  if(viewerIndex<0) viewerIndex=0;
  if(viewerIndex>=viewerImages.length) viewerIndex=viewerImages.length-1;

  document.getElementById("viewerImg").src=viewerImages[viewerIndex];
}

window.likePost = likePost;
window.addComment = addComment;
window.openViewer = openViewer;
window.viewerSlide = viewerSlide;


/* swipe mobile */
let viewerStartX=0;

const viewer = document.getElementById("photoViewer");
if(viewer){
  viewer.addEventListener("pointerdown",e=>{
    viewerStartX=e.clientX;
  });

  viewer.addEventListener("pointerup",e=>{
    const diff=e.clientX-viewerStartX;

    if(Math.abs(diff)>50){
      if(diff<0) viewerSlide(1);
      else viewerSlide(-1);
    }
  });
}

async function likePost(btn,id){

  if(!currentUser){
  openAuth();
  return;
}

  const span = btn.querySelector("span");
  let count = parseInt(span.innerText) || 0;

  const liked = btn.classList.contains("liked");

  // 👇 toggle UI ngay
  btn.classList.toggle("liked");

  if(liked){

    span.innerText = count - 1;

    updateDoc(doc(db,"posts",id),{
      likesCount: increment(-1),
      likedBy: arrayRemove(currentUser.uid)
    });

  }else{

    span.innerText = count + 1;

    // 👇 hiệu ứng bánh chạy NGAY
    spawnBanhTet(btn);

    updateDoc(doc(db,"posts",id),{
      likesCount: increment(1),
      likedBy: arrayUnion(currentUser.uid)
    });
  }
}




async function addComment(){

  if(!currentUser){
  openAuth();
  return;
}

  const text=document.getElementById("commentText").value.trim();
  if(!text) return;

  await updateDoc(doc(db,"posts",currentPost),{
    comments: arrayUnion({
      user:currentUser?.displayName || currentUser?.email || "User",
      text:text,
      time:Date.now()
    })
  });

  document.getElementById("commentText").value="";

  // 👇 load lại comment ngay
  openCommentFromBtn(
    document.querySelector(`.post-card[data-id="${currentPost}"] .action`)
  );

  // 👇 load lại feed để update số comment
  loadPosts();
}


function spawnBanhTet(btn){

  const rect = btn.getBoundingClientRect();

  requestAnimationFrame(()=>{

    const item=document.createElement("div");
    item.className="flying-banh";

    item.innerHTML=`
    <svg viewBox="0 0 100 100" width="40" height="40">
      <rect x="10" y="10" width="80" height="80" rx="12"
            fill="#2e7d32" stroke="#1b5e20" stroke-width="4"/>
      <line x1="10" y1="50" x2="90" y2="50"
            stroke="#ffd54f" stroke-width="5"/>
      <line x1="50" y1="10" x2="50" y2="90"
            stroke="#ffd54f" stroke-width="5"/>
    </svg>
    `;

    item.style.left = rect.left + rect.width/2 - 20 + "px";
    item.style.top  = rect.top + "px";

    document.body.appendChild(item);

    setTimeout(()=>item.remove(),900);
  });
}

/*---NÚT 3 CHẤM---*/
function togglePostMenu(btn){

  // đóng menu khác
  document.querySelectorAll(".menu-popup").forEach(m=>{
    if(m!==btn.nextElementSibling) m.style.display="none";
  });

  const menu = btn.nextElementSibling;
  menu.style.display = menu.style.display==="block" ? "none" : "block";
}

// click ngoài thì đóng menu
document.addEventListener("click",e=>{
  if(!e.target.closest(".post-menu")){
    document.querySelectorAll(".menu-popup")
      .forEach(m=>m.style.display="none");
  }
});

window.togglePostMenu = togglePostMenu;

/*---SỬA BÀI---*/
async function editPost(id){

  if(!isAdmin){
    alert("Chỉ admin mới có quyền sửa bài");
    return;
  }

  const snap = await getDocs(query(collection(db,"posts")));
  const dataDoc = snap.docs.find(d=>d.id===id);
  if(!dataDoc) return;

  const data = dataDoc.data();

  openModal();

  document.getElementById("captionInput").value = data.caption || "";

  window.editingPostId = id;
  window.oldImages = data.images || [];
  window.oldPaths = data.paths || [];

  const preview=document.getElementById("previewBox");
  preview.innerHTML="";

  window.oldImages.forEach((img,i)=>{
    preview.insertAdjacentHTML("beforeend",`
      <div class="preview-item" data-old="${i}">
        <img src="${img}">
        <div class="remove-old" onclick="removeOldImage(${i})">✕</div>
      </div>
    `);
  });
}

window.editPost = editPost;

async function removeOldImage(index){

  const path = window.oldPaths[index];

  if(path){
    try{
      await deleteObject(ref(storage,path));
    }catch(e){
      console.log("Không xoá được ảnh cũ:",e);
    }
  }

  window.oldImages.splice(index,1);
  window.oldPaths.splice(index,1);

  document.querySelector(`.preview-item[data-old="${index}"]`)?.remove();
}
window.removeOldImage = removeOldImage;

/*---CỐ ĐỊNH CHIỀU CAO THEO ẢNH ĐẦU---*/
function fixCarouselHeight(carousel){

  const firstImg = carousel.querySelector(".carousel-track img");
  if(!firstImg) return;

  const applyHeight = ()=>{
    const h = firstImg.getBoundingClientRect().height;
    if(h>0) carousel.style.height = h + "px";
  };

  // nếu ảnh chưa load
  if(!firstImg.complete){
    firstImg.addEventListener("load",applyHeight);
  }else{
    // ảnh đã cache
    requestAnimationFrame(applyHeight);
  }
}

document.addEventListener("pointerup",function(e){

  const img = e.target.closest(".post-carousel img, .post-image img");
  if(!img) return;

  const now = Date.now();
  const diff = now - lastTap;

  if(diff < 300){

    const post = img.closest(".post-card");
    const likeBtn = post.querySelector(".action.like");

    if(likeBtn && !likeBtn.classList.contains("liked")){

      likeBtn.click();        // like thật
      spawnBigBanh(post);     // 👈 BÁNH TO GIỮA ẢNH
    }
  }

  lastTap = now;
});


function spawnBigBanh(post){

  const banh=document.createElement("div");
  banh.className="ig-banh";

  banh.innerHTML=`
<svg viewBox="0 0 100 100" width="95" height="95">

  <defs>
    <linearGradient id="banhGlow" x1="0" x2="1">
      <stop offset="0%" stop-color="#2e7d32"/>
      <stop offset="100%" stop-color="#43a047"/>
    </linearGradient>
  </defs>

  <rect x="10" y="10" width="80" height="80" rx="14"
        fill="url(#banhGlow)" stroke="#ffd54f" stroke-width="6"/>

  <line x1="10" y1="50" x2="90" y2="50"
        stroke="#ffd54f" stroke-width="7"/>

  <line x1="50" y1="10" x2="50" y2="90"
        stroke="#ffd54f" stroke-width="7"/>

</svg>
`;

  const media = post.querySelector(".post-carousel, .post-image");
  if(!media) return;

  media.style.position="relative";
  media.appendChild(banh);

  setTimeout(()=>banh.remove(),800);
}

/* ===== DARK MODE FIXED ===== */

const switchBtn = document.getElementById("switch");

// load trạng thái
if(localStorage.getItem("theme")==="light"){
  document.body.classList.remove("dark");
  switchBtn.checked = true;
}else{
  document.body.classList.add("dark");
  switchBtn.checked = false;
}

// toggle
switchBtn.addEventListener("change",()=>{

  if(switchBtn.checked){
    // bật sáng
    document.body.classList.remove("dark");
    localStorage.setItem("theme","light");
  }else{
    // bật tối
    document.body.classList.add("dark");
    localStorage.setItem("theme","dark");
  }

});

/*=====ĐĂNG NHẬP=====*/
function openAuth(type="user"){

  document.getElementById("authPopup").style.display="flex";

  const user=document.getElementById("userLogin");
  const admin=document.getElementById("adminLogin");
  const title=document.getElementById("authTitle");

  if(type==="admin"){
    title.innerText="Đăng nhập Admin";
    user.style.display="none";
    admin.style.display="block";
  }else{
    title.innerText="Đăng nhập để tiếp tục";
    user.style.display="block";
    admin.style.display="none";
  }
}

function closeAuth(){
  document.getElementById("authPopup").style.display="none";
}


function loginAdmin(){

  const email=document.getElementById("adminEmail").value;
  const pass=document.getElementById("adminPass").value;

  signInWithEmailAndPassword(auth,email,pass)
  .then(userCredential=>{

    currentUser = userCredential.user;

    // 👇 check admin chuẩn
    isAdmin = ADMIN_EMAILS.includes(currentUser.email);

    closeAuth();
    openModal();

  })
  .catch(()=>{
    alert("Sai tài khoản admin");
  });

}

onAuthStateChanged(auth,user=>{

  currentUser=user;

  const box=document.getElementById("userBox");

  if(user){

    box.style.display="flex";

    document.getElementById("userAvatar").src =
      user.photoURL || "https://api.dicebear.com/7.x/thumbs/svg?seed="+user.email;

    document.getElementById("userName").innerText=
      user.displayName || user.email;

    // 👇 check admin chuẩn
    isAdmin = ADMIN_EMAILS.includes(user.email);
    if(isAdmin){
  document.getElementById("visitBox").style.display="block";
}

  }else{

    box.style.display="none";
    isAdmin=false;

  }

});


window.openAuth = openAuth;
window.closeAuth = closeAuth;
window.loginAdmin = loginAdmin;
window.handleCreateClick = handleCreateClick;

function logout(){
  signOut(auth);
}
window.logout = logout;

/*--ĐĂNG KÍ---*/
function registerUser(){

  const email=document.getElementById("userEmail").value;
  const pass=document.getElementById("userPass").value;

  if(!email || !pass){
    alert("Nhập đủ tài khoản và mật khẩu");
    return;
  }

  createUserWithEmailAndPassword(auth,email,pass)
  .then(()=>{
    closeAuth();   // tự login luôn
  })
  .catch(err=>{
    alert(err.message);
  });
}

/*---ĐĂNG NHẬP---*/
function loginUser(){

  const email=document.getElementById("userEmail").value;
  const pass=document.getElementById("userPass").value;

  signInWithEmailAndPassword(auth,email,pass)
  .then(()=>{
    closeAuth();
    showToast("Đăng nhập thành công 🎉");
    location.reload();
  })
  .catch(()=>{
    alert("Sai tài khoản hoặc chưa đăng ký");
  });
}

window.loginUser = loginUser;
window.registerUser = registerUser;

function toggleAdminPass(){
  const input = document.getElementById("adminPass");
  input.type = input.type === "password" ? "text" : "password";
}

function toggleUserPass(){
  const input = document.getElementById("userPass");
  input.type = input.type === "password" ? "text" : "password";
}

window.toggleUserPass = toggleUserPass;
window.toggleAdminPass = toggleAdminPass;

function showToast(text){
  const toast=document.getElementById("toast");
  if(!toast) return;

  toast.innerText=text;
  toast.classList.add("show");

  setTimeout(()=>{
    toast.classList.remove("show");
  },2500);
}

window.showToast=showToast;

/*===XOÁ COMMENT===*/
async function deleteComment(time){

  if(!confirm("Xoá bình luận này?")) return;

  const snap = await getDocs(query(collection(db,"posts")));
  const docSnap = snap.docs.find(d=>d.id===currentPost);
  if(!docSnap) return;

  const data = docSnap.data();
  const comments = data.comments || [];

  const newComments = comments.filter(c=>c.time !== time);

  await updateDoc(doc(db,"posts",currentPost),{
    comments:newComments
  });

  openCommentFromBtn(
    document.querySelector(`.post-card[data-id="${currentPost}"] .action`)
  );

  loadPosts();
}

window.deleteComment = deleteComment;


/* ===== ONLINE SYSTEM CHUẨN ===== */

// collection online
const onlineCol = collection(db,"onlineUsers");

// session id an toàn cho mobile + desktop
// session id cố định cho mỗi thiết bị
let sessionId = localStorage.getItem("sessionId");

if(!sessionId){
  sessionId =
    crypto?.randomUUID?.() ||
    "s_" + Math.random().toString(36).slice(2);

  localStorage.setItem("sessionId",sessionId);
}

// ping user đang online
async function pingOnline(){
  try{
    await setDoc(doc(onlineCol,sessionId),{
      lastSeen: Date.now(),
      uid: currentUser?.uid || "guest"
    });
  }catch(e){
    console.log("Ping lỗi",e);
  }
}

// ping ngay khi load
window.addEventListener("load",()=>{
  pingOnline();
  setInterval(pingOnline,15000);
});

// realtime đếm user online
onSnapshot(onlineCol,snap=>{
  const now = Date.now();
  let online = 0;

  snap.forEach(d=>{
    if(now - d.data().lastSeen < 30000) online++;
  });

  const box=document.getElementById("onlineCount");
  if(box) box.innerText = online;
});

function toggleUserMenu(){
  const menu=document.getElementById("userMenu");
  menu.style.display = menu.style.display==="block" ? "none" : "block";
}

document.addEventListener("click",e=>{
  if(!e.target.closest(".user-box")){
    document.getElementById("userMenu").style.display="none";
  }
});
/* ===== VISIT COUNT (FIX RELOAD + TỐI ƯU) ===== */

const statsRef = doc(db,"stats","visitors");

// realtime hiển thị visit (chỉ chạy 1 lần)
onSnapshot(statsRef,snap=>{
  const data = snap.data();
  const box = document.getElementById("totalCount");
  if(box) box.innerText = data?.totalVisits || 0;
});

// tăng visit duy nhất 1 lần mỗi tab mở
(async ()=>{

  try{

    // nếu tab này đã tính rồi thì thôi
    if(sessionStorage.getItem("visitCounted")) return;

    const snap = await getDoc(statsRef);

    if(!snap.exists()){
      await setDoc(statsRef,{ totalVisits:1 });
    }else{
      await updateDoc(statsRef,{
        totalVisits: increment(1)
      });
    }

    // đánh dấu tab này đã tính visit
    sessionStorage.setItem("visitCounted","1");

  }catch(e){
    console.log("Visit lỗi",e);
  }

})();

window.toggleUserMenu = toggleUserMenu;

/* ===== CHỈ HIỆN HEADER Ở ĐẦU TRANG ===== */
window.addEventListener("scroll", () => {

  if(window.pageYOffset > 60){
    document.body.classList.add("hide-top");
  }else{
    document.body.classList.remove("hide-top");
  }

});

/* ===== HEADER CHỈ HIỆN Ở HOME ===== */
function updateHeaderVisibility(){

  const home = document.getElementById("home");

  if(home && home.classList.contains("active")){
    document.body.classList.remove("hide-page-header");
  }else{
    document.body.classList.add("hide-page-header");
  }
}

/* chạy mỗi khi đổi trang */
const oldShowPage = showPage;
showPage = function(pageId){
  oldShowPage(pageId);
  updateHeaderVisibility();
};

/* chạy lúc load trang */
window.addEventListener("DOMContentLoaded",updateHeaderVisibility);