// --- CONFIGURAÇÃO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyDAozYqHIjJe-ptzkVIfqLMC2XTyMG0GaI",
    authDomain: "meucronogramaenem.firebaseapp.com",
    projectId: "meucronogramaenem",
    storageBucket: "meucronogramaenem.firebasestorage.app",
    messagingSenderId: "933774063012",
    appId: "1:933774063012:web:5f3556ea2c0f1885a4bd31"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// --- BASE DE DADOS DE CONTEÚDOS ---
const SUBJECTS_DATA = {
    linguagens: [
        { id: 'l1', title: 'Interpretação de Texto', desc: 'Tipos de textos, gêneros e funções.' },
        { id: 'l2', title: 'Modernismo no Brasil', desc: 'Principais fases e autores.' },
        { id: 'l3', title: 'Gramática Aplicada', desc: 'Concordância, regência e pontuação.' },
        { id: 'l4', title: 'Literatura Contemporânea', desc: 'Tendências atuais da literatura.' },
        { id: 'l5', title: 'Artes e Educação Física', desc: 'Cultura e movimentos artísticos.' }
    ],
    matematica: [
        { id: 'm1', title: 'Razão e Proporção', desc: 'Regra de três, escalas e porcentagem.' },
        { id: 'm2', title: 'Geometria Plana', desc: 'Áreas, perímetros e triângulos.' },
        { id: 'm3', title: 'Funções (1º e 2º Grau)', desc: 'Análise de gráficos e equações.' },
        { id: 'm4', title: 'Estatística e Probabilidade', desc: 'Média, mediana, moda e eventos.' },
        { id: 'm5', title: 'Trigonometria', desc: 'Triângulo retângulo e ciclo trigonométrico.' }
    ],
    natureza: [
        { id: 'n1', title: 'Ecologia', desc: 'Cadeias alimentares e impactos ambientais.' },
        { id: 'n2', title: 'Genética e Biotecnologia', desc: 'Leis de Mendel e DNA.' },
        { id: 'n3', title: 'Mecânica (Física)', desc: 'Leis de Newton e movimento.' },
        { id: 'n4', title: 'Estequiometria (Química)', desc: 'Cálculos químicos e massa.' },
        { id: 'n5', title: 'Química Orgânica', desc: 'Funções e cadeias carbônicas.' }
    ],
    humanas: [
        { id: 'h1', title: 'Brasil Colônia e Império', desc: 'Ciclos econômicos e independência.' },
        { id: 'h2', title: 'Geopolítica Mundial', desc: 'Globalização e conflitos.' },
        { id: 'h3', title: 'Sociologia e Filosofia', desc: 'Ética, política e sociedade.' },
        { id: 'h4', title: 'Meio Ambiente e Clima', desc: 'Biomas e problemas climáticos.' },
        { id: 'h5', title: 'Idade Moderna e Contemporânea', desc: 'Revoluções e Guerras Mundiais.' }
    ]
};

// --- ESTADO GLOBAL ---
let currentTasks = [];
let completedTopics = [];
let activeTask = null;
let editingTaskId = null;
let currentDate = new Date();
let timerObj = { pomo: { int: null, time: 3000, target: null }, stop: { int: null, time: 0, start: null } };

// --- CHARTS INSTANCES ---
let donutChart, redacaoLine, redacaoMonthChart, timePieChart, qntPieChart, dailyBarChart;

// --- AUTH LOGIC ---
const loginGoogle = () => auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
const logout = () => auth.signOut();

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'block';
        document.getElementById('user-name').innerText = user.displayName ? user.displayName.split(' ')[0] : 'Estudante';
        document.getElementById('user-pic').src = localStorage.getItem('custom_profile_pic') || user.photoURL || 'https://via.placeholder.com/40';
        loadUserData();
        loadTasks();
        restoreTimers();
    } else {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
    }
});

// --- DATA LOADING ---
const loadUserData = async () => {
    const doc = await db.collection("users").doc(auth.currentUser.uid).get();
    if (doc.exists) {
        const data = doc.data();
        if (data.meta) document.getElementById('edit-meta').innerText = data.meta;
        if (data.ano) document.getElementById('edit-ano').innerText = data.ano;
        completedTopics = data.completedTopics || [];
    }
    updateCountdown();
    updateAllProgressBars();
};

const loadTasks = () => {
    db.collection("tasks").where("userId", "==", auth.currentUser.uid).onSnapshot(snap => {
        currentTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderCalendar();
        renderTaskList();
        renderDashboardTasks();
        renderConquistas();
        if (document.getElementById('section-desempenho').classList.contains('active')) initCharts();
    });
};

// --- SPA NAVIGATION ---
const initNavigation = () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const targetSectionId = item.getAttribute('data-section');
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `section-${targetSectionId}`) section.classList.add('active');
            });
            if (targetSectionId === 'desempenho' || targetSectionId === 'redacao') initCharts();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
};

// --- SUBJECT MISSIONS LOGIC ---
const initSubjects = () => {
    const cards = document.querySelectorAll('.subject-category-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const subjectKey = card.getAttribute('data-subject');
            renderSubjectDetail(subjectKey);
            document.getElementById('subjects-main-grid').classList.add('hidden');
            document.getElementById('subject-detail').classList.remove('hidden');
        });
    });
    document.querySelector('.back-btn').addEventListener('click', () => {
        document.getElementById('subject-detail').classList.add('hidden');
        document.getElementById('subjects-main-grid').classList.remove('hidden');
        updateAllProgressBars();
    });
};

const renderSubjectDetail = (key) => {
    const container = document.getElementById('topics-container');
    const title = document.getElementById('detail-title');
    const topics = SUBJECTS_DATA[key];
    title.innerText = key.charAt(0).toUpperCase() + key.slice(1);
    container.innerHTML = '';
    topics.forEach(topic => {
        const isDone = completedTopics.includes(topic.id);
        const div = document.createElement('div');
        div.classList.add('topic-card');
        div.innerHTML = `
            <div class="topic-info"><h4>${topic.title}</h4><p>${topic.desc}</p></div>
            <div class="topic-actions"><label class="action-item"><input type="checkbox" ${isDone ? 'checked' : ''}> Concluído</label></div>
        `;
        div.querySelector('input').addEventListener('change', (e) => toggleTopic(topic.id, e.target.checked, key));
        container.appendChild(div);
    });
    updateSubjectDetailProgress(key);
};

const toggleTopic = async (id, done, key) => {
    if (done) { if (!completedTopics.includes(id)) completedTopics.push(id); }
    else { completedTopics = completedTopics.filter(tid => tid !== id); }
    await db.collection("users").doc(auth.currentUser.uid).set({ completedTopics }, { merge: true });
    updateSubjectDetailProgress(key);
    updateAllProgressBars();
};

const updateSubjectDetailProgress = (key) => {
    const topics = SUBJECTS_DATA[key];
    const done = topics.filter(t => completedTopics.includes(t.id)).length;
    const pct = Math.round((done / topics.length) * 100);
    document.getElementById('detail-percent').innerText = `${pct}%`;
    document.getElementById('detail-progress-bar').style.width = `${pct}%`;
};

const updateAllProgressBars = () => {
    const areas = ['linguagens', 'matematica', 'natureza', 'humanas'];
    const dashList = document.getElementById('dashboard-progress-list');
    dashList.innerHTML = '';
    let totalDone = completedTopics.length;

    areas.forEach(area => {
        const topics = SUBJECTS_DATA[area];
        const done = topics.filter(t => completedTopics.includes(t.id)).length;
        const pct = Math.round((done / topics.length) * 100);
        
        // Update Mini Cards
        const miniCard = document.querySelector(`.subject-category-card[data-subject="${area}"]`);
        if (miniCard) {
            miniCard.querySelector('.percent').innerText = `${pct}%`;
            miniCard.querySelector('.mini-bar .fill').style.width = `${pct}%`;
        }

        // Add to Dashboard
        const div = document.createElement('div');
        div.classList.add('progress-item');
        div.innerHTML = `
            <div class="progress-info"><span>${area.charAt(0).toUpperCase() + area.slice(1)}</span><span>${pct}%</span></div>
            <div class="progress-bar-bg"><div class="progress-bar-fill" style="width: ${pct}%; background: var(--primary);"></div></div>
        `;
        dashList.appendChild(div);
    });
};

// --- CALENDAR & TASKS ---
const renderCalendar = () => {
    const grid = document.getElementById('calendar-grid');
    const monthDisplay = document.getElementById('currentMonthYear');
    grid.innerHTML = '';
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthsNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    monthDisplay.innerText = `${monthsNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += '<div class="calendar-day empty"></div>';
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        if (dateStr === new Date().toISOString().split('T')[0]) dayDiv.classList.add('today');
        dayDiv.innerHTML = `<span class="day-number">${d}</span>`;
        const dayTasksDiv = document.createElement('div');
        dayTasksDiv.classList.add('day-tasks');
        currentTasks.filter(t => t.date === dateStr).forEach(task => {
            const dot = document.createElement('span');
            dot.classList.add('task-dot', task.type);
            dayTasksDiv.appendChild(dot);
        });
        dayDiv.appendChild(dayTasksDiv);
        dayDiv.onclick = () => openTaskModal(dateStr);
        grid.appendChild(dayDiv);
    }
};

const openTaskModal = (date) => {
    editingTaskId = null;
    document.getElementById('modal-date-label').innerText = `Agendar para: ${date.split('-').reverse().join('/')}`;
    document.getElementById('task-type').value = 'aula';
    toggleTaskFields();
    document.getElementById('modal-task').style.display = 'flex';
    document.getElementById('modal-task').dataset.date = date;
};

const toggleTaskFields = () => {
    const type = document.getElementById('task-type').value;
    const container = document.getElementById('dynamic-fields');
    let html = '';
    const matSelect = `<select id="task-materia"><option value="Matemática">Matemática</option><option value="Natureza">Natureza</option><option value="Humanas">Humanas</option><option value="Linguagens">Linguagens</option></select>`;
    if (type === 'aula') html = matSelect + `<input type="text" id="task-content" placeholder="Conteúdo da Aula">`;
    else if (type === 'questoes') html = matSelect + `<input type="text" id="task-content" placeholder="Assunto"><input type="number" id="task-qnt" placeholder="Meta de Questões">`;
    else if (type === 'simulado') html = `<input type="text" id="task-content" placeholder="Nome do Simulado"><input type="number" id="task-qnt" placeholder="Total de Questões">`;
    else if (type === 'redacao') html = `<input type="text" id="task-content" placeholder="Tema da Redação"><input type="number" id="task-meta-redacao" placeholder="Meta de Nota (ex: 900)">`;
    container.innerHTML = html;
};

const handleSaveTask = async () => {
    const date = document.getElementById('modal-task').dataset.date;
    const type = document.getElementById('task-type').value;
    const materia = document.getElementById('task-materia')?.value || (type === 'redacao' ? 'Redação' : 'Simulado');
    const content = document.getElementById('task-content')?.value || '';
    const start = document.getElementById('task-start-time').value;
    const end = document.getElementById('task-end-time').value;
    
    const taskData = {
        userId: auth.currentUser.uid,
        date, type, materia, content, startTime: start, endTime: end,
        status: 'pending', createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    if (document.getElementById('task-qnt')) taskData.qnt = parseInt(document.getElementById('task-qnt').value);
    if (document.getElementById('task-meta-redacao')) taskData.metaRedacao = parseInt(document.getElementById('task-meta-redacao').value);

    await db.collection("tasks").add(taskData);
    closeModal('modal-task');
};

const renderConquistas = () => {
    const today = new Date().toISOString().split('T')[0];
    const doneTasks = currentTasks.filter(t => t.status === 'done');
    const questoes = doneTasks.filter(t => t.type === 'questoes' || t.type === 'simulado');
    
    let stats = {
        totalQ: questoes.reduce((acc, q) => acc + (q.hits + q.errors), 0),
        qToday: questoes.filter(q => q.date === today).reduce((acc, q) => acc + (q.hits + q.errors), 0),
        redTotal: doneTasks.filter(t => t.type === 'redacao').length
    };

    // Render Medals
    const medals = [
        { title: "Calouro", desc: "100 questões", icon: "🌱", target: 100, val: stats.totalQ },
        { title: "Veterano", desc: "500 questões", icon: "🔥", target: 500, val: stats.totalQ },
        { title: "Elite", desc: "1000 questões", icon: "👑", target: 1000, val: stats.totalQ }
    ];
    
    document.getElementById('medal-container').innerHTML = medals.map(m => `
        <div class="medal-card ${m.val >= m.target ? 'unlocked' : 'locked'}">
            <span class="medal-icon">${m.icon}</span>
            <div class="medal-title">${m.title}</div>
            <div class="medal-desc">${m.desc}</div>
            <small>${m.val}/${m.target}</small>
        </div>
    `).join('');

    // Render Missions
    const missions = [
        { title: "Aquecimento", desc: "5 questões hoje", target: 5, val: stats.qToday, type: 'diaria' },
        { title: "Foco Total", desc: "30 questões hoje", target: 30, val: stats.qToday, type: 'diaria' },
        { title: "Escritor", desc: "5 redações totais", target: 5, val: stats.redTotal, type: 'vitalicia' }
    ];

    document.getElementById('missions-container').innerHTML = missions.map(m => {
        const pct = Math.min((m.val / m.target) * 100, 100);
        return `
            <div class="mission-item">
                <div class="mission-header"><span class="tag">${m.type}</span> <strong>${m.val}/${m.target}</strong></div>
                <div class="mission-title">${m.title}</div>
                <p>${m.desc}</p>
                <div class="mission-progress-bg"><div class="mission-progress-fill" style="width:${pct}%;"></div></div>
            </div>
        `;
    }).join('');
};

const renderTaskList = () => {
    const pendingList = document.getElementById('tasks-pending-list');
    const incompleteList = document.getElementById('tasks-incomplete-list');
    const doneList = document.getElementById('tasks-done-list');
    const redacaoList = document.getElementById('redacao-list');
    
    pendingList.innerHTML = incompleteList.innerHTML = doneList.innerHTML = redacaoList.innerHTML = '';
    const today = new Date().toISOString().split('T')[0];

    currentTasks.forEach(t => {
        const card = createSimpleTaskCard(t);
        if (t.type === 'redacao') redacaoList.appendChild(card);
        else if (t.status === 'done') doneList.appendChild(card);
        else if (t.date < today) incompleteList.appendChild(card);
        else pendingList.appendChild(card);
    });
};

const createSimpleTaskCard = (t) => {
    const div = document.createElement('div');
    div.classList.add('task-item');
    div.innerHTML = `
        <div class="task-info">
            <span class="badge ${t.type}">${t.type.toUpperCase()}</span>
            <strong>${t.materia}</strong> - ${t.content || ''}
            <p>${t.date.split('-').reverse().join('/')} | ${t.startTime} - ${t.endTime}</p>
        </div>
        <div class="task-actions">
            ${t.status === 'pending' ? `<button onclick="openDoneModal('${t.id}')" class="btn-check"><i class="fas fa-check"></i></button>` : ''}
        </div>
    `;
    return div;
};

// --- PERFORMANCE CHARTS & ANALYTICS ---
const initCharts = () => {
    const doneTasks = currentTasks.filter(t => t.status === 'done');
    const totalHits = doneTasks.reduce((acc, t) => acc + (t.hits || 0), 0);
    const totalErrors = doneTasks.reduce((acc, t) => acc + (t.errors || 0), 0);
    const totalQ = totalHits + totalErrors;
    const totalTime = doneTasks.reduce((acc, t) => acc + (t.realTime || 0), 0);

    document.getElementById('stat-total-q').innerText = totalQ;
    document.getElementById('stat-total-q-conq').innerText = totalQ;
    document.getElementById('stat-accuracy').innerText = (totalQ > 0 ? Math.round((totalHits / totalQ) * 100) : 0) + '%';
    document.getElementById('stat-redacoes').innerText = doneTasks.filter(t => t.type === 'redacao').length;

    // Stats by Difficulty
    document.getElementById('stats-facil-q').innerText = doneTasks.filter(t => t.difficulty === 'facil').reduce((acc, t) => acc + (t.hits + t.errors), 0);
    document.getElementById('stats-medio-q').innerText = doneTasks.filter(t => t.difficulty === 'medio').reduce((acc, t) => acc + (t.hits + t.errors), 0);
    document.getElementById('stats-dificil-q').innerText = doneTasks.filter(t => t.difficulty === 'dificil').reduce((acc, t) => acc + (t.hits + t.errors), 0);

    // Accuracy Donut
    if (donutChart) donutChart.destroy();
    donutChart = new Chart(document.getElementById('accDonutChart'), {
        type: 'doughnut',
        data: { labels: ['Certas', 'Erradas'], datasets: [{ data: [totalHits, totalErrors], backgroundColor: ['#22c55e', '#ef4444'], borderWidth: 0, cutout: '75%' }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#f1f5f9', padding: 20 } } } }
    });
    document.getElementById('center-donut-text').innerHTML = `${totalQ}<br><span>questões</span>`;

    // Time by Subject
    const timeData = {};
    doneTasks.forEach(t => { if(t.realTime) timeData[t.materia] = (timeData[t.materia] || 0) + t.realTime; });
    if (timePieChart) timePieChart.destroy();
    timePieChart = new Chart(document.getElementById('timePieChart'), {
        type: 'pie',
        data: { labels: Object.keys(timeData), datasets: [{ data: Object.values(timeData), backgroundColor: ['#38bdf8', '#a855f7', '#22c55e', '#f59e0b'], borderWidth: 0 }] },
        options: { plugins: { legend: { position: 'bottom', labels: { color: '#f1f5f9' } } } }
    });

    renderReviewList(doneTasks);
};

const renderReviewList = (doneTasks) => {
    const list = document.getElementById('review-list');
    const errorsOnly = doneTasks.filter(t => t.errors > 0 && !t.reviewed);
    list.innerHTML = errorsOnly.length > 0 ? '' : '<p class="empty-msg">Nenhuma revisão pendente! 🎉</p>';
    
    errorsOnly.forEach(t => {
        const div = document.createElement('div');
        div.className = 'review-item';
        div.innerHTML = `
            <div class="review-info">
                <strong>${t.materia}</strong>
                <p>${t.errors} erros em ${t.date.split('-').reverse().join('/')}</p>
            </div>
            <button onclick="markAsReviewed('${t.id}')" class="btn-check-small">Revisado</button>
        `;
        list.appendChild(div);
    });
};

const markAsReviewed = async (id) => {
    await db.collection("tasks").doc(id).update({ reviewed: true });
};

const openDifficultyDetails = (diff) => {
    const filtered = currentTasks.filter(t => t.status === 'done' && t.difficulty === diff);
    alert(`Histórico ${diff}: ${filtered.length} sessões encontradas.`);
    // Here we could open a modal similar to the user's code
};

const openImprovementModal = () => {
    const doneTasks = currentTasks.filter(t => t.status === 'done');
    const matStats = {};
    doneTasks.forEach(t => {
        if(!matStats[t.materia]) matStats[t.materia] = { hits: 0, total: 0 };
        matStats[t.materia].hits += (t.hits || 0);
        matStats[t.materia].total += ((t.hits || 0) + (t.errors || 0));
    });

    const improveList = document.getElementById('improve-list');
    improveList.innerHTML = '';
    Object.keys(matStats).forEach(mat => {
        const acc = matStats[mat].total > 0 ? (matStats[mat].hits / matStats[mat].total) : 0;
        if (acc < 0.7 && matStats[mat].total > 0) {
            const span = document.createElement('span');
            span.className = 'tag danger';
            span.innerText = `${mat} (${Math.round(acc*100)}%)`;
            improveList.appendChild(span);
        }
    });
    
    document.getElementById('imp-reviewed-count').innerText = doneTasks.filter(t => t.reviewed).length;
    document.getElementById('imp-pending-count').innerText = doneTasks.filter(t => t.errors > 0 && !t.reviewed).length;
    document.getElementById('modal-improvement').style.display = 'flex';
};

const openDoneModal = (id) => {
    activeTask = currentTasks.find(t => t.id === id);
    document.getElementById('done-task-info').innerText = `${activeTask.materia} - ${activeTask.type.toUpperCase()}`;
    const container = document.getElementById('done-dynamic-fields');
    const diffContainer = document.getElementById('difficulty-selection');

    if (activeTask.type === 'questoes' || activeTask.type === 'simulado') {
        diffContainer.classList.remove('hidden');
        container.innerHTML = `
            <div class="form-group"><label>Tempo Real (min)</label><input type="number" id="done-time" value="${activeTask.plannedTime || 30}"></div>
            <div class="form-row" style="display:flex; gap:10px;">
                <div class="form-group" style="flex:1;"><label>Acertos</label><input type="number" id="done-hits"></div>
                <div class="form-group" style="flex:1;"><label>Erros</label><input type="number" id="done-errors"></div>
            </div>
        `;
    } else {
        diffContainer.classList.add('hidden');
        container.innerHTML = `<div class="form-group"><label>Tempo Real (min)</label><input type="number" id="done-time" value="${activeTask.plannedTime || 30}"></div>`;
    }
    document.getElementById('modal-done').style.display = 'flex';
};

const setDifficulty = (val) => {
    document.getElementById('task-difficulty-val').value = val;
    document.querySelectorAll('.diff-btns button').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-diff-${val}`).classList.add('active');
};

const confirmTaskCompletion = async () => {
    const updateData = { status: 'done', realTime: parseInt(document.getElementById('done-time').value) };
    if (activeTask.type === 'questoes' || activeTask.type === 'simulado') {
        updateData.hits = parseInt(document.getElementById('done-hits').value);
        updateData.errors = parseInt(document.getElementById('done-errors').value);
        updateData.difficulty = document.getElementById('task-difficulty-val').value;
    }
    await db.collection("tasks").doc(activeTask.id).update(updateData);
    closeModal('modal-done');
};

// --- FOCO MODE ---
const formatTime = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

const startPomodoro = () => {
    clearInterval(timerObj.pomo.int);
    let mins = document.getElementById('pomo-focus-time').value;
    timerObj.pomo.target = Date.now() + (mins * 60 * 1000);
    localStorage.setItem('pomoTarget', timerObj.pomo.target);
    timerObj.pomo.int = setInterval(() => {
        let rem = Math.max(0, Math.floor((timerObj.pomo.target - Date.now()) / 1000));
        document.getElementById('pomo-display').innerText = formatTime(rem);
        if (rem <= 0) { clearInterval(timerObj.pomo.int); alert("Pomodoro Finalizado!"); }
    }, 1000);
};

const pauseTimer = (type) => { clearInterval(timerObj[type].int); localStorage.removeItem(`${type}Target`); };

// --- HELPERS ---
const closeModal = (id) => document.getElementById(id).style.display = 'none';
const openNotifications = () => document.getElementById('modal-notif').style.display = 'flex';
const updateCountdown = () => {
    const ano = document.getElementById('edit-ano').innerText.match(/\d{4}/);
    const target = new Date(`${ano || 2026}-11-01T00:00:00`).getTime();
    setInterval(() => {
        const diff = target - Date.now();
        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        document.getElementById('countdown-timer').innerText = `${d}d ${h}h ${m}m ${s}s`;
    }, 1000);
};

const restoreTimers = () => {
    const pT = localStorage.getItem('pomoTarget');
    if (pT && pT > Date.now()) { timerObj.pomo.target = pT; startPomodoro(); }
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initSubjects();
    document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); };
    document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); };
});
