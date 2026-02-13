import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, updateDoc, query, orderBy, limit, getDocs, startAfter, deleteDoc, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyALHh2CFuSSWI2MR6RyiqRZZf4ABnp9Zyo",
  authDomain: "deep-horizons-51171.firebaseapp.com",
  projectId: "deep-horizons-51171",
  storageBucket: "deep-horizons-51171.firebasestorage.app",
  messagingSenderId: "670734932259",
  appId: "1:670734932259:web:07dab3af4aefb077221496",
  measurementId: "G-TPLB1K4SEY"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let lastVisiblePost = null;
let isAdmin = false;

// Auth Functions
window.handleLogin = async () => { 
    try { await signInWithPopup(auth, provider); } catch (e) { console.error(e); } 
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        isAdmin = (user.email === "campameurer@gmail.com");
        document.getElementById('user-info').innerText = user.email;
        document.getElementById('user-info').style.display = 'inline';
        document.getElementById('login-btn').innerText = 'Logout';
        if (isAdmin) document.getElementById('admin-controls').style.display = 'block';
    }
    loadPosts();
});

// Post Management
window.savePost = async () => {
    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('post-title').value;
    const image = document.getElementById('post-image').value;
    const content = document.getElementById('post-body').value;

    if (id) {
        await updateDoc(doc(db, "posts", id), { title, image, content });
    } else {
        await addDoc(collection(db, "posts"), { title, image, content, date: new Date() });
    }
    location.reload();
};

window.editPost = async (event, id) => {
    event.stopPropagation();
    const docSnap = await getDoc(doc(db, "posts", id));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('panel-title').innerText = "Edit Post";
        document.getElementById('edit-id').value = id;
        document.getElementById('post-title').value = data.title;
        document.getElementById('post-image').value = data.image;
        document.getElementById('post-body').value = data.content;
        window.scrollTo(0,0);
    }
};

window.deletePost = async (event, id) => {
    event.stopPropagation();
    if (confirm("Delete permanently?")) {
        await deleteDoc(doc(db, "posts", id));
        location.reload();
    }
};

// UI Functions
window.toggleAdminPanel = () => {
    const panel = document.getElementById('admin-panel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
};

window.toggleOptionsMenu = (event) => {
    event.stopPropagation();
    const menu = event.currentTarget.nextElementSibling;
    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.togglePost = (event, element) => {
    if (event.target.closest('.admin-menu-container')) return;
    if (event.target.classList.contains('close-post')) {
        event.stopPropagation();
        element.classList.remove('active');
        return;
    }
    element.classList.add('active');
};

async function loadPosts(isNextPage = false) {
    let q = query(collection(db, "posts"), orderBy("date", "desc"), limit(6));
    if (isNextPage && lastVisiblePost) q = query(collection(db, "posts"), orderBy("date", "desc"), startAfter(lastVisiblePost), limit(6));
    
    const snap = await getDocs(q);
    if (snap.empty) return;
    lastVisiblePost = snap.docs[snap.docs.length - 1];
    
    const feed = document.getElementById('blog-feed');
    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        feed.innerHTML += `
            <article class="blog-card" onclick="togglePost(event, this)">
                <div class="card-header">
                    <span class="close-post">&times;</span>
                    <div class="admin-menu-container" style="${isAdmin ? 'display:block' : ''}">
                        <span class="admin-dots" onclick="toggleOptionsMenu(event)">⋮</span>
                        <div class="admin-options">
                            <button onclick="editPost(event, '${id}')">Edit</button>
                            <button onclick="deletePost(event, '${id}')" style="color:red">Delete</button>
                        </div>
                    </div>
                    <h3>${p.title}</h3>
                </div>
                <div class="card-content">${p.content}</div>
                ${p.image ? `<div class="card-image"><img src="${p.image}"></div>` : ''}
            </article>`;
    });
    document.getElementById('load-more').style.display = 'block';
}

window.onclick = () => document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
window.loadPosts = loadPosts;
