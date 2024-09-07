let tasks = [];

function loadTasks() {
    fetch('/tasks')
        .then(response => response.json())
        .then(data => {
            tasks = data;
            renderAllTasks();
        })
        .catch(error => {
            console.error('Error loading tasks:', error);
        });
}

function renderAllTasks() {
    document.getElementById('pendingTaskList').innerHTML = '';
    document.getElementById('inProgressTaskList').innerHTML = '';
    document.getElementById('completedTaskList').innerHTML = '';
    document.getElementById('archivedTaskList').innerHTML = '';
    
    tasks.forEach(task => renderTask(task));
}

function renderTask(task) {
    const li = createTaskElement(task);
    const taskList = document.getElementById(task.status + 'TaskList');
    if (taskList) {
        taskList.appendChild(li);
        updateTaskButtons(li, task.status);
    } else {
        console.error(`Task list not found for status: ${task.status}`);
    }
}

function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = 'list-group-item';
    li.dataset.taskId = task.id;
    
    // Determinar el color de fondo basado en la fecha de vencimiento
    const today = new Date().setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate).setHours(0, 0, 0, 0);
    
    if (task.status !== 'completed' && task.status !== 'archived') {
        if (dueDate === today) {
            li.style.backgroundColor = '#d4edda'; // Verde claro
        } else if (dueDate < today) {
            li.style.backgroundColor = '#f8d7da'; // Rojo claro
        }
    }
    
    const taskInfo = document.createElement('div');
    taskInfo.innerHTML = `
        <strong>${task.text}</strong><br>
        <small>Creada: ${new Date(task.createdDate).toLocaleDateString()}</small><br>
        <small>Fecha límite: <span class="due-date">${new Date(task.dueDate).toLocaleDateString()}</span></small>
        ${task.completedDate ? `<br><small>Completada: ${new Date(task.completedDate).toLocaleDateString()}</small>` : ''}
    `;
    li.appendChild(taskInfo);
    
    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group btn-group-sm mt-2 d-flex flex-wrap';
    li.appendChild(btnGroup);
    
    return li;
}

function updateTaskButtons(li, status) {
    const btnGroup = li.querySelector('.btn-group');
    btnGroup.innerHTML = '';
    
    if (status === "pending") {
        addButton(btnGroup, "Iniciar", "btn-primary", () => moveTask(li, "inProgress"));
        addButton(btnGroup, "Editar Fecha", "btn-info", () => editDueDate(li));
    } else if (status === "inProgress") {
        addButton(btnGroup, "Completar", "btn-success", () => moveTask(li, "completed"));
        addButton(btnGroup, "Volver a Pendiente", "btn-warning", () => moveTask(li, "pending"));
        addButton(btnGroup, "Editar Fecha", "btn-info", () => editDueDate(li));
    } else if (status === "completed") {
        addButton(btnGroup, "Volver a En Proceso", "btn-warning", () => moveTask(li, "inProgress"));
        addButton(btnGroup, "Archivar", "btn-secondary", () => moveTask(li, "archived"));
    } else if (status === "archived") {
        addButton(btnGroup, "Volver a Completado", "btn-success", () => moveTask(li, "completed"));
        addButton(btnGroup, "Clonar a Pendientes", "btn-info", () => cloneTaskToPending(li));
    }
    
    if (status !== "archived") {
        addButton(btnGroup, "Eliminar", "btn-danger", () => deleteTask(li));
    }
}

function addButton(btnGroup, text, className, onClick) {
    const button = document.createElement('button');
    button.className = `btn ${className} btn-sm me-1 mb-1`;
    button.innerHTML = text;
    button.onclick = onClick;
    btnGroup.appendChild(button);
}

function addTaskFromInput() {
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('dueDateInput');
    if (taskInput.value.trim() !== '' && dueDateInput.value) {
        addTask(taskInput.value.trim(), dueDateInput.value);
        taskInput.value = '';
        dueDateInput.value = '';
    } else {
        alert("Por favor, ingrese tanto el texto de la tarea como la fecha límite.");
    }
}

function addTask(taskText, dueDate, status = "pending") {
    fetch('/tasks', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: taskText,
            dueDate: dueDate,
            status: status
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log('Task added successfully:', data);
        loadTasks();
    })
    .catch(error => {
        console.error('Error adding task:', error);
    });
}

function moveTask(li, newStatus) {
    const taskId = li.dataset.taskId;
    fetch(`/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            status: newStatus,
            completedDate: newStatus === 'completed' ? new Date().toISOString().split('T')[0] : null
        }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        loadTasks(); // Actualizar las tareas inmediatamente después de mover una tarea
    })
    .catch(error => {
        console.error('Error moving task:', error);
    });
}

function deleteTask(li) {
    const taskId = li.dataset.taskId;
    fetch(`/tasks/${taskId}`, {
        method: 'DELETE',
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        loadTasks(); // Actualizar las tareas inmediatamente después de eliminar una tarea
    })
    .catch(error => {
        console.error('Error deleting task:', error);
    });
}

function editDueDate(li) {
    const taskId = li.dataset.taskId;
    const task = tasks.find(t => t.id.toString() === taskId);
    const currentDueDate = new Date(task.dueDate);
    
    const newDueDate = prompt("Ingrese la nueva fecha de vencimiento (YYYY-MM-DD):", currentDueDate.toISOString().split('T')[0]);
    
    if (newDueDate && !isNaN(new Date(newDueDate))) {
        fetch(`/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                dueDate: newDueDate
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            loadTasks(); // Actualizar las tareas inmediatamente después de editar la fecha
        })
        .catch(error => {
            console.error('Error updating due date:', error);
        });
    } else if (newDueDate !== null) {
        alert("Fecha inválida. Por favor, use el formato YYYY-MM-DD.");
    }
}

function toggleArchive() {
    const archiveList = document.getElementById('archivedTaskList');
    const toggleBtn = document.getElementById('toggleArchiveBtn');
    if (archiveList.style.display === 'none') {
        archiveList.style.display = 'block';
        toggleBtn.textContent = 'Ocultar Archivo';
    } else {
        archiveList.style.display = 'none';
        toggleBtn.textContent = 'Mostrar Archivo';
    }
}

document.getElementById('taskInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        addTaskFromInput();
    }
});

document.getElementById('searchInput').addEventListener('input', searchTasks);

function searchTasks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    tasks.forEach(task => {
        const li = document.querySelector(`li[data-task-id="${task.id}"]`);
        if (li) {
            if (task.text.toLowerCase().includes(searchTerm)) {
                li.style.display = '';
            } else {
                li.style.display = 'none';
            }
        }
    });
}

function cloneTaskToPending(li) {
    const taskId = li.dataset.taskId;
    const task = tasks.find(t => t.id.toString() === taskId);
    const today = new Date().toISOString().split('T')[0];
    addTask(task.text, today, "pending");
}

function updateTasksFromTelnyx() {
    loadTasks();
    loadSMSTasks();
}

setInterval(updateTasksFromTelnyx, 30000);

function loadSMSTasks() {
    fetch('/get_sms_tasks')
        .then(response => response.json())
        .then(tasks => {
            const tasksList = document.getElementById('smsPendingTasksList');
            tasksList.innerHTML = '';
            tasks.forEach(task => {
                const li = document.createElement('li');
                li.className = 'list-group-item d-flex justify-content-between align-items-center';
                li.innerHTML = `
                    <div>
                        <strong>${task.text}</strong> (Vence: ${new Date(task.dueDate).toLocaleDateString()})<br>
                        <small class="text-muted">De: ${task.phoneNumber}</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">SMS</span>
                `;
                tasksList.appendChild(li);
            });
        })
        .catch(error => console.error('Error:', error));
}

window.onload = function() {
    loadTasks();
    loadSMSTasks();
};

// Add this to your existing JavaScript file

let authorizedNumbersVisible = false;
let password = '';

function toggleAuthorizedNumbers() {
    const section = document.getElementById('authorizedNumbersSection');
    const button = document.getElementById('toggleAuthorizedNumbersBtn');
    const passwordPrompt = document.getElementById('passwordPrompt');
    const authorizedNumbersContent = document.getElementById('authorizedNumbersContent');
    const addTaskForm = document.getElementById('addTaskForm');
    
    if (authorizedNumbersVisible) {
        section.style.display = 'none';
        button.textContent = 'Manage Authorized Numbers';
        authorizedNumbersVisible = false;
        password = '';
        addTaskForm.style.display = 'none'; // Hide the add task form when closing the section
    } else {
        section.style.display = 'block';
        button.textContent = 'Hide Authorized Numbers';
        authorizedNumbersVisible = true;
        passwordPrompt.style.display = 'block';
        authorizedNumbersContent.style.display = 'none';
        addTaskForm.style.display = 'none'; // Ensure the add task form is hidden when opening the section
    }
}

document.getElementById('submitPasswordBtn').addEventListener('click', function() {
    const passwordInput = document.getElementById('passwordInput');
    password = passwordInput.value;
    
    fetch('/check_password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('passwordPrompt').style.display = 'none';
            document.getElementById('authorizedNumbersContent').style.display = 'block';
            document.getElementById('addTaskForm').style.display = 'block'; // Show the add task form
            loadAuthorizedNumbers();
        } else {
            alert('Incorrect password');
            passwordInput.value = '';
            password = '';
        }
    });
});

function loadAuthorizedNumbers() {
    fetch('/authorized_numbers', {
        headers: { 'X-Password': password }
    })
    .then(response => {
        if (response.status === 401) {
            throw new Error('Unauthorized');
        }
        return response.json();
    })
    .then(numbers => {
        const numbersList = document.getElementById('authorizedNumbers');
        numbersList.innerHTML = '';
        numbers.forEach(number => {
            const li = document.createElement('li');
            li.className = 'list-group-item d-flex justify-content-between align-items-center';
            li.innerHTML = `
                <span>${number.phoneNumber} - ${number.description}</span>
                <div>
                    <button class="btn btn-sm btn-outline-primary me-2" onclick="editAuthorizedNumber(${number.id})">Edit</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteAuthorizedNumber(${number.id})">Delete</button>
                </div>
            `;
            numbersList.appendChild(li);
        });
    })
    .catch(error => {
        if (error.message === 'Unauthorized') {
            alert('Session expired. Please enter the password again.');
            toggleAuthorizedNumbers();
        }
    });
}

document.getElementById('addAuthorizedNumberForm').onsubmit = function(e) {
    e.preventDefault();
    const phoneNumber = document.getElementById('phoneNumber').value;
    const description = document.getElementById('description').value;
    fetch('/authorized_numbers', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'X-Password': password
        },
        body: JSON.stringify({ phoneNumber, description })
    })
        .then(response => response.json())
        .then(() => {
            loadAuthorizedNumbers();
            document.getElementById('phoneNumber').value = '';
            document.getElementById('description').value = '';
        });
};

function editAuthorizedNumber(id) {
    const newPhoneNumber = prompt('Enter new phone number:');
    const newDescription = prompt('Enter new description:');
    fetch(`/authorized_numbers/${id}`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            'X-Password': password
        },
        body: JSON.stringify({ phoneNumber: newPhoneNumber, description: newDescription })
    })
        .then(() => loadAuthorizedNumbers());
}

function deleteAuthorizedNumber(id) {
    if (confirm('Are you sure you want to delete this number?')) {
        fetch(`/authorized_numbers/${id}`, { 
            method: 'DELETE',
            headers: { 'X-Password': password }
        })
            .then(() => loadAuthorizedNumbers());
    }
}

// Add event listener for the toggle button
document.getElementById('toggleAuthorizedNumbersBtn').addEventListener('click', toggleAuthorizedNumbers);