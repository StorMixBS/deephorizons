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
const ADMIN_EMAIL = "campameurer@gmail.com";

window.handleLogin = async () => { 
    try { await signInWithPopup(auth, provider); } catch (e) { console.error("Login error:", e); } 
};

onAuthStateChanged(auth, (user) => {
    const userInfo = document.getElementById('user-info');
    const loginBtn = document.getElementById('login-btn');
    const adminControls = document.getElementById('admin-controls');

    if (user) {
        isAdmin = (user.email === ADMIN_EMAIL);
        userInfo.innerText = user.email;
        userInfo.style.display = 'inline';
        loginBtn.innerText = 'Logout';
        loginBtn.onclick = () => auth.signOut().then(() => location.reload());
        
        if (isAdmin) adminControls.style.display = 'block';
    } else {
        isAdmin = false;
        userInfo.style.display = 'none';
        loginBtn.innerText = 'Login with Google';
        loginBtn.onclick = window.handleLogin;
        adminControls.style.display = 'none';
    }
    if (!lastVisiblePost) loadPosts();
});

window.savePost = async () => {
    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Unauthorized: Only the administrator can perform this action.");
        return;
    }

    const id = document.getElementById('edit-id').value;
    const title = document.getElementById('post-title').value;
    const image = document.getElementById('post-image').value;
    const content = document.getElementById('post-body').value;

    if (!title || !content) {
        alert("Please fill in the title and content.");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "posts", id), { title, image, content });
        } else {
            await addDoc(collection(db, "posts"), { title, image, content, date: new Date() });
        }
        location.reload();
    } catch (e) {
        console.error("Permission denied by Firebase Rules:", e);
        alert("Error: You don't have permission to write to the database.");
    }
};

window.editPost = async (event, id) => {
    event.stopPropagation();
    if (!isAdmin) return;

    const docSnap = await getDoc(doc(db, "posts", id));
    if (docSnap.exists()) {
        const data = docSnap.data();
        document.getElementById('admin-panel').style.display = 'block';
        document.getElementById('panel-title').innerText = "Edit Post";
        document.getElementById('edit-id').value = id;
        document.getElementById('post-title').value = data.title;
        document.getElementById('post-image').value = data.image;
        document.getElementById('post-body').value = data.content;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

window.deletePost = async (event, id) => {
    event.stopPropagation();
    const user = auth.currentUser;
    if (!user || user.email !== ADMIN_EMAIL) {
        alert("Unauthorized.");
        return;
    }

    if (confirm("Are you sure you want to delete this news permanently?")) {
        try {
            await deleteDoc(doc(db, "posts", id));
            location.reload();
        } catch (e) {
            alert("Database Error: Failed to delete.");
        }
    }
};

// --- UI FUNCTIONS ---
window.toggleAdminPanel = () => {
    const panel = document.getElementById('admin-panel');
    const isVisible = panel.style.display === 'block';
    panel.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
        document.getElementById('panel-title').innerText = "Create New Post";
        document.getElementById('edit-id').value = "";
    }
};

window.toggleOptionsMenu = (event) => {
    event.stopPropagation();
    // Fecha outros menus abertos
    document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
    const menu = event.currentTarget.nextElementSibling;
    menu.style.display = 'block';
};

window.togglePost = (event, element) => {
    // Se clicar nos menus de admin, não abre/fecha o post
    if (event.target.closest('.admin-menu-container')) return;
    
    if (event.target.classList.contains('close-post')) {
        event.stopPropagation();
        element.classList.remove('active');
        return;
    }
    
    if (!element.classList.contains('active')) {
        element.classList.add('active');
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

async function loadPosts(isNextPage = false) {
    let q = query(collection(db, "posts"), orderBy("date", "desc"), limit(6));
    if (isNextPage && lastVisiblePost) {
        q = query(collection(db, "posts"), orderBy("date", "desc"), startAfter(lastVisiblePost), limit(6));
    }
    
    const snap = await getDocs(q);
    if (snap.empty) {
        document.getElementById('load-more').style.display = 'none';
        return;
    }
    
    lastVisiblePost = snap.docs[snap.docs.length - 1];
    const feed = document.getElementById('blog-feed');

    snap.forEach(docSnap => {
        const p = docSnap.data();
        const id = docSnap.id;
        feed.innerHTML += `
            <article class="blog-card" onclick="togglePost(event, this)">
                <div class="card-header">
                    <span class="close-post">&times;</span>
                    <div class="admin-menu-container" style="${isAdmin ? 'display:block' : 'display:none'}">
                        <span class="admin-dots" onclick="toggleOptionsMenu(event)">⋮</span>
                        <div class="admin-options">
                            <button onclick="editPost(event, '${id}')">Edit</button>
                            <button onclick="deletePost(event, '${id}')" style="color:red">Delete</button>
                        </div>
                    </div>
                    <h3>${p.title}</h3>
                </div>
                <div class="card-content">${p.content}</div>
                ${p.image ? `<div class="card-image"><img src="${p.image}" alt="news image"></div>` : ''}
            </article>`;
    });
    document.getElementById('load-more').style.display = 'block';
}

// Global click to close menus
window.onclick = () => {
    document.querySelectorAll('.admin-options').forEach(m => m.style.display = 'none');
};

// Export to window
window.loadPosts = loadPosts;
