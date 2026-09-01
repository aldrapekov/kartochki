// 1. Импорт функций Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getDatabase, ref, onValue, update } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-database.js";

// 2. Конфигурация вашей базы данных Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDPN8eYRrU3JbBRs12MeROOu3zd7o9QIgU",
  authDomain: "kartochki-ade77.firebaseapp.com",
  databaseURL: "https://kartochki-ade77-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kartochki-ade77",
  storageBucket: "kartochki-ade77.firebasestorage.app",
  messagingSenderId: "467392945380",
  appId: "1:467392945380:web:cd7bb9d8c4f2998003e0f1",
  measurementId: "G-NY9BN4G7LT"
};
// 3. Инициализация Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let studentsData = {};
let currentClass = null;

// 4. Получение данных из базы в реальном времени
const classesRef = ref(db, 'classes');
onValue(classesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
        studentsData = data;
        renderClasses(); // Отрисовываем кнопки классов на главном экране
        if (currentClass) {
            renderStudents(); // Если открыт класс, обновляем список учеников
        }
    } else {
        // Если база пустая, загружаем тестовые классы
        seedDatabase();
    }
});

// 5. Отрисовка кнопок классов на главном экране
function renderClasses() {
    const classListContainer = document.getElementById('class-list');
    if (!classListContainer) return;

    classListContainer.innerHTML = '';
    const classNames = Object.keys(studentsData);

    classNames.forEach(className => {
        classListContainer.innerHTML += `
            <button class="class-btn" onclick="openClass('${className}')">${className}</button>
        `;
    });
}

// 6. Открыть выбранный класс
function openClass(className) {
    currentClass = className;
    document.getElementById('classes-screen').classList.add('hidden');
    document.getElementById('lesson-screen').classList.remove('hidden');
    document.getElementById('current-class-title').innerText = `Класс: ${className}`;
    renderStudents();
}

// 7. Вернуться на главный экран
function goBack() {
    currentClass = null;
    document.getElementById('lesson-screen').classList.add('hidden');
    document.getElementById('classes-screen').classList.remove('hidden');
}

// 8. Отрисовка списка учеников
function renderStudents() {
    const container = document.getElementById('students-list');
    container.innerHTML = '';
    
    const classStudents = studentsData[currentClass] || {};
    
    Object.keys(classStudents).forEach(studentId => {
        const student = classStudents[studentId];
        const canUseGreen = (student.l_green || 0) > 0 && (student.l_yellow || 0) > 0;
        
        container.innerHTML += `
            <div class="student-card">
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <div class="stats">
                        Четверть: 🟨 ${student.q_yellow || 0} | 🟥 ${student.q_red || 0}<br>
                        Урок: 🟨 ${student.l_yellow || 0} | 🟥 ${student.l_red || 0} | 🟩 ${student.l_green || 0}
                    </div>
                </div>
                <div class="cards-control">
                    <button class="btn-yellow" onclick="addCard('${studentId}', 'yellow')"></button>
                    <button class="btn-red" onclick="addCard('${studentId}', 'red')"></button>
                    <button class="btn-green" onclick="addCard('${studentId}', 'green')"></button>
                    <button class="btn-action" ${!canUseGreen ? 'disabled' : ''} onclick="redeemGreen('${studentId}')">Списать</button>
                </div>
            </div>
        `;
    });
}

// 9. Добавление карточки
function addCard(studentId, type) {
    const student = studentsData[currentClass][studentId];
    if (!student) return;

    if (type === 'yellow') {
        student.l_yellow = (student.l_yellow || 0) + 1;
        if (student.l_yellow === 2) {
            student.l_yellow = 0;
            student.l_red = (student.l_red || 0) + 1;
            alert(`${student.name} получает Красную карточку (2 желтые за урок)!`);
        }
    } else if (type === 'red') {
        student.l_red = (student.l_red || 0) + 1;
    } else if (type === 'green') {
        student.l_green = (student.l_green || 0) + 1;
    }

    const updates = {};
    updates[`classes/${currentClass}/${studentId}`] = student;
    update(ref(db), updates);
}

// 10. Использование зеленой карточки
function redeemGreen(studentId) {
    const student = studentsData[currentClass][studentId];
    if (student && (student.l_green || 0) > 0 && (student.l_yellow || 0) > 0) {
        student.l_green--;
        student.l_yellow--;
        
        const updates = {};
        updates[`classes/${currentClass}/${studentId}`] = student;
        update(ref(db), updates);
    }
}
// Функция быстрого добавления ученика
function addNewStudent() {
    // Всплывающее окно для ввода имени
    const studentName = prompt("Введите имя и фамилию ученика:");
    
    // Если нажали "Отмена" или ввели пустоту - ничего не делаем
    if (!studentName || studentName.trim() === "") return;

    // Генерируем уникальный ID на основе текущего времени (чтобы не было совпадений)
    const newStudentId = 's_' + Date.now();

    // Создаем карточку с нулевой статистикой
    const newStudent = { 
        name: studentName.trim(), 
        q_yellow: 0, 
        q_red: 0, 
        l_yellow: 0, 
        l_green: 0, 
        l_red: 0 
    };

    // Отправляем в Firebase
    const updates = {};
    updates[`classes/${currentClass}/${newStudentId}`] = newStudent;
    
    update(ref(db), updates);
    // Нам даже не нужно вызывать renderStudents(), 
    // так как onValue сам заметит изменения в базе и обновит список на экране!
}
// 11. Завершение урока
function endLesson() {
    if (!confirm("Завершить урок? Зеленые карточки сгорят, а штрафы перенесутся в четверть.")) return;

    const classStudents = studentsData[currentClass] || {};
    const updates = {};

    Object.keys(classStudents).forEach(studentId => {
        const student = classStudents[studentId];
        
        student.q_yellow = (student.q_yellow || 0) + (student.l_yellow || 0);
        student.q_red = (student.q_red || 0) + (student.l_red || 0);

        if (student.q_yellow >= 5) {
            const extraReds = Math.floor(student.q_yellow / 5);
            student.q_red += extraReds;
            student.q_yellow = student.q_yellow % 5;
        }

        student.l_yellow = 0;
        student.l_green = 0;
        student.l_red = 0;

        updates[`classes/${currentClass}/${studentId}`] = student;
    });

    update(ref(db), updates);
    alert("Урок завершен! Статистика обновлена.");
}

// 12. Тестовые данные (создаются 1 раз, если база Firebase пустая)
function seedDatabase() {
    const initialData = {
        "classes": {
            "5А": {
                "s1": { name: "Арман Т.", q_yellow: 3, q_red: 0, l_yellow: 0, l_green: 0, l_red: 0 },
                "s2": { name: "Алиса В.", q_yellow: 0, q_red: 0, l_yellow: 0, l_green: 0, l_red: 0 }
            },
            "5Б": {
                "s3": { name: "Данияр К.", q_yellow: 1, q_red: 0, l_yellow: 0, l_green: 0, l_red: 0 },
                "s4": { name: "София М.", q_yellow: 0, q_red: 0, l_yellow: 0, l_green: 0, l_red: 0 }
            }
        }
    };
    update(ref(db), initialData);
}

// КРИТИЧЕСКИ ВАЖНО: Привязываем функции к window, чтобы HTML видeл клики
window.openClass = openClass;
window.goBack = goBack;
window.addCard = addCard;
window.redeemGreen = redeemGreen;
window.addNewStudent = addNewStudent;
window.endLesson = endLesson;
