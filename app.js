import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// COLOQUE SUAS CHAVES DO FIREBASE AQUI
const firebaseConfig = {
        apiKey: "AIzaSyC6fo9PVQ5nYjXRezXCo_kgC5DcbL5o8o4",
		authDomain: "corenexa-9d938.firebaseapp.com",
		projectId: "corenexa-9d938",
		storageBucket: "corenexa-9d938.firebasestorage.app",
		messagingSenderId: "342666577648",
		appId: "1:342666577648:web:775809b2f0bcac02f1a435"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ==========================================
// MÁSCARAS E UTILITÁRIOS
// ==========================================
const aplicarMascaraCpf = (inputElement) => {
    if(!inputElement) return;
    inputElement.addEventListener('input', (e) => {
        let valor = e.target.value;
        if (!valor.includes('@')) { // Só aplica máscara se não parecer um email
            valor = valor.replace(/\D/g, "");
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d)/, "$1.$2");
            valor = valor.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
            e.target.value = valor;
        }
    });
};

// ==========================================
// LÓGICA DA PÁGINA DE LOGIN (index.html)
// ==========================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    aplicarMascaraCpf(document.getElementById('identificador'));

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = loginForm.querySelector('button');
        btn.innerText = "Aguarde..."; btn.disabled = true;

        let identificador = document.getElementById('identificador').value.trim();
        const senha = document.getElementById('senha').value;
        let emailParaLogin = identificador;

        try {
            if (!identificador.includes('@')) {
                const cpfLimpo = identificador.replace(/\D/g, '');
                const cpfSnap = await getDoc(doc(db, "cpfs_emails", cpfLimpo));
                if (cpfSnap.exists()) {
                    emailParaLogin = cpfSnap.data().emailVinculado;
                } else {
                    throw new Error("cpf-nao-encontrado");
                }
            }
            await signInWithEmailAndPassword(auth, emailParaLogin, senha);
            window.location.href = "dashboard.html";
        } catch (error) {
            btn.innerText = "Entrar"; btn.disabled = false;
            alert("Dados incorretos. Verifique as suas credenciais.");
        }
    });
}

// ==========================================
// LÓGICA DA PÁGINA DE REGISTRO (registro.html)
// ==========================================
const registroForm = document.getElementById('registroForm');
if (registroForm) {
    aplicarMascaraCpf(document.getElementById('cpf'));

    registroForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = registroForm.querySelector('button');
        btn.innerText = "Criando conta..."; btn.disabled = true;

        const nome = document.getElementById('nome').value;
        const telefone = document.getElementById('telefone').value;
        const cpfLimpo = document.getElementById('cpf').value.replace(/\D/g, '');
        const nascimento = document.getElementById('nascimento').value;
        const email = document.getElementById('email').value;
        const senha = document.getElementById('senha').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
            const user = userCredential.user;

            await setDoc(doc(db, "usuarios", user.uid), {
                nomeCompleto: nome, telefone: telefone, cpf: cpfLimpo, dataNascimento: nascimento,
                email: email, downloadUrl: "", statusAtivo: true, criadoEm: new Date().toISOString()
            });

            await setDoc(doc(db, "cpfs_emails", cpfLimpo), { emailVinculado: email });

            alert("Conta criada com sucesso!");
            window.location.href = "index.html";
        } catch (error) {
            btn.innerText = "Criar Conta"; btn.disabled = false;
            alert("Erro ao criar conta. " + (error.code === 'auth/email-already-in-use' ? "E-mail já em uso." : error.message));
        }
    });
}

// ==========================================
// LÓGICA DA RECUPERAÇÃO DE SENHA (recuperar-senha.html)
// ==========================================
const recuperarForm = document.getElementById('recuperarForm');
if (recuperarForm) {
    recuperarForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const btn = recuperarForm.querySelector('button');
        btn.innerText = "Enviando..."; btn.disabled = true;

        try {
            await sendPasswordResetEmail(auth, email);
            recuperarForm.style.display = 'none';
            document.getElementById('mensagemSucesso').style.display = 'block';
        } catch (error) {
            btn.innerText = "Enviar Link"; btn.disabled = false;
            alert("Erro ao enviar. Verifique se o e-mail está correto.");
        }
    });
}

// ==========================================
// LÓGICA DO DASHBOARD (dashboard.html)
// ==========================================
if (window.location.pathname.includes("dashboard")) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const docSnap = await getDoc(doc(db, "usuarios", user.uid));
            if (docSnap.exists()) {
                const dados = docSnap.data();
                // Preenche os dados
                document.getElementById('lbl-nome').innerText = dados.nomeCompleto || '-';
                document.getElementById('lbl-cpf').innerText = dados.cpf || '-';
                document.getElementById('lbl-email').innerText = dados.email || '-';
                document.getElementById('lbl-user').innerText = dados.coreUser || 'Aguardando liberação...';
                document.getElementById('lbl-pass').innerText = dados.corePassword || 'Aguardando liberação...';
                
                const btnDownload = document.getElementById('btnDownload');
                btnDownload.href = dados.downloadUrl || "#";
                if (!dados.downloadUrl) {
                    btnDownload.innerText = "Instalador Indisponível";
                    btnDownload.style.background = "#94a3b8";
                    btnDownload.style.pointerEvents = "none";
                }
            }
        } else {
            window.location.href = "index.html";
        }
    });

    // Funções globais para o menu
    window.switchMenu = (menuId) => {
        document.querySelectorAll('.main-content section').forEach(sec => sec.classList.remove('active'));
        document.querySelectorAll('.sidebar nav a').forEach(a => a.classList.remove('active'));
        document.getElementById('sessao-' + menuId).classList.add('active');
        document.getElementById('menu-' + menuId).classList.add('active');
    };

    window.logout = () => {
        signOut(auth).then(() => window.location.href = "index.html");
    };
}
