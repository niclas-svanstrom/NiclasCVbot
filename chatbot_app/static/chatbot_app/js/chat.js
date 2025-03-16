let selectedConversationKey = null;


const md = markdownit({
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(str, { language: lang }).value;
            } catch (__) {
                console.error("Error highlighting with language:", lang, __);
            }
        }
        return md.utils.escapeHtml(str); // Use default escaping
    }
});

function copyToClipboard(button) {
    const codeBlock = button.closest('.code-container').querySelector('code');
    const codeBlockClone = codeBlock.cloneNode(true);

    // Remove line numbers
    codeBlockClone.querySelectorAll('.hljs-ln-numbers').forEach(el => el.remove());
    const codeText = codeBlockClone.textContent;
    navigator.clipboard.writeText(codeText).then(() => {
        button.textContent = 'Copied!';
        setTimeout(() => {
            button.textContent = 'Copy';
        }, 2000);
    });
}

function getRelativeDateLabel(date) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const diff = now - date;

    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    if (isSameDay(now, date)) {
        return 'Today';
    } else if (isSameDay(new Date(now - oneDay), date)) {
        return 'Yesterday';
    } else if (diff < oneWeek) {
        return 'Last Week';
    } else if (diff < oneMonth) {
        return 'Last Month';
    } else {
        return 'Older';
    }
}

function addLineNumbers(codeHtml) {
    const code = codeHtml.split('\n').map((line, index) =>
        `<span class="hljs-ln-numbers">${index + 1}</span>${line}`).join('\n');
    return `<span class="line-numbers">${code}</span>`;
}

function renderCodeBlock(tokens, idx, options, env, slf) {
    const token = tokens[idx];
    const langName = token.info.trim();
    const content = token.content.trim();

    const highlightCode = md.options.highlight(content, langName);
    const codeHtml = addLineNumbers(highlightCode);

    return `<div class="code-container">
                <div class="code-title-container">
                <div class="language-label">${langName ? langName : 'plaintext'}</div>
                <button class="copy-code-button" onclick="copyToClipboard(this)">Copy</button>
                </div>
                <pre><code class="hljs ${langName}">${codeHtml}</code></pre>
            </div>`;
}

md.renderer.rules.fence = renderCodeBlock;

function adjustTextareaHeight(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createCopyButtons(buttonContainer, activeMessageContainer) {
    // Create button container with template literals
    buttonContainer.innerHTML = `
        <button class="copy-button" right-data-tooltip="Copy message text">
            <i class="fa-regular fa-clipboard"></i>
        </button>
        <button class="copy-rich-button" right-data-tooltip="Copy rich text">
            <span class="fa-stack">
                <i class="fa-regular fa-clipboard fa-stack-2x"></i>
                <i class="fa-solid fa-align-left fa-stack-1x"></i>
            </span>
        </button>
    `;

    // Select buttons and icons
    const copyButton = buttonContainer.querySelector('.copy-button');
    const copyRichButton = buttonContainer.querySelector('.copy-rich-button');
    const copyIcon = copyButton.querySelector('i');
    const copyRichIcon = copyRichButton.querySelector('.fa-clipboard');
    const copyRichIconText = copyRichButton.querySelector('.fa-align-left');

    // Copy plain text
    copyButton.addEventListener('click', () => {
        const text = Array.from(activeMessageContainer.querySelectorAll('.assistant-message'))
            .map(div => div.innerText)
            .join('\n');

        navigator.clipboard.writeText(text).then(() => {
            copyIcon.classList.replace('fa-regular', 'fa-solid');
            copyIcon.classList.replace('fa-clipboard', 'fa-check');

            setTimeout(() => {
                copyIcon.classList.replace('fa-solid', 'fa-regular');
                copyIcon.classList.replace('fa-check', 'fa-clipboard');
            }, 3000);
        });
    });

    // Copy rich text
    copyRichButton.addEventListener('click', () => {
        const text = Array.from(activeMessageContainer.querySelectorAll('.assistant-message'))
            .map(div => div.innerHTML)
            .join('');

        const blob = new Blob([text], { type: 'text/html' });
        const data = [new ClipboardItem({ 'text/html': blob })];

        navigator.clipboard.write(data).then(() => {
            copyRichIcon.classList.replace('fa-regular', 'fa-solid');
            copyRichIcon.classList.replace('fa-clipboard', 'fa-check');
            copyRichIconText.style.display = 'none';

            setTimeout(() => {
                copyRichIcon.classList.replace('fa-solid', 'fa-regular');
                copyRichIcon.classList.replace('fa-check', 'fa-clipboard');
                copyRichIconText.style.display = 'inline-block';
            }, 3000);
        });
    });
}


function showConversationMenu(event, key) {
    event.stopPropagation();
    selectedConversationKey = key;
    const menu = document.getElementById('menu');
    menu.style.display = 'flex';
    menu.style.top = event.clientY + 'px';

    const navbar = document.querySelector('.navbar');
    // Get the computed position style of the navbar
    const navbarPosition = window.getComputedStyle(navbar).position;
    let left;

    if (navbarPosition === 'absolute') {
        // If the navbar is absolute (e.g. for smaller screens), use the event coordinate as-is.
        left = event.clientX;
    } else {
        // Otherwise, subtract the navbar's width from the x-coordinate.
        left = event.clientX - navbar.offsetWidth;
    }

    menu.style.left = left + 'px';
}


function hideConversationMenu() {
    const menu = document.getElementById('menu');
    menu.style.display = 'none';
}

function downloadConversation() {
    const conversation = getConversation(selectedConversationKey);
    const content = `# ${conversation.title}\\n\\n` + conversation.messages.map(msg => `${msg.role}: ${msg.text}\\n`).join('\\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${conversation.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
    hideConversationMenu();
}

function renameConversation() {
    hideConversationMenu();
    const conversation = getConversation(selectedConversationKey);
    const conversationItem = document.querySelector(`[data-conversation-id="${selectedConversationKey}"]`);
    console.log(conversationItem);

    const conversationButton = conversationItem.querySelector('.conversation-title');
    const originalText = conversationButton.querySelector('p').textContent.trim();
    const conversationText = conversationButton.querySelector('p');

    // Create an input field
    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.value = originalText;
    inputField.className = 'rename-input';

    // Replace the conversation button text with the input field
    conversationText.innerHTML = '';
    conversationText.appendChild(inputField);

    // Focus the input field
    inputField.focus();

    // Stop click event from propagating to prevent unwanted closing
    inputField.addEventListener('click', (event) => event.stopPropagation());

    function saveAndExit() {
        const newName = inputField.value.trim();
        if (newName) {
            conversation.title = newName;
            saveConversation(selectedConversationKey, conversation);
            showConversations();
        } else {
            conversationText.textContent = originalText; // Revert if empty
        }
    }

    inputField.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            saveAndExit();
        }
    });

    inputField.addEventListener('blur', () => {
        saveAndExit();
    });
}

function setFavorite() {
    const key = selectedConversationKey;
    const conversation = getConversation(key);
    conversation.isFavorite = !conversation.isFavorite;
    saveConversation(key, conversation);
    showConversations();
    hideConversationMenu();
}

function deleteConversation() {
    localStorage.removeItem(selectedConversationKey);
    const allKeys = getConversationKeys();

    if (allKeys.length > 0) {
        // Open the next available conversation
        selectedConversationKey = allKeys[0];
        openConversation(selectedConversationKey);
    } else {
        // Create a new conversation if none exist
        startNewConversation();
    }

    showConversations();
    hideConversationMenu();
}

function toggleNavbarContainer() {
    const conversationList = document.getElementById('navbar');
    const conversationListStyles = window.getComputedStyle(conversationList);
    const toggleIcon = document.getElementById('toggle-navbar-icon');
    const dependentElement = document.querySelector('.toggle-navbar-container');
    if (conversationList.style.display === 'none' || conversationList.style.display === '') {
        conversationList.style.display = 'flex';
        toggleIcon.classList.add('navbar-rotate');
        if (conversationListStyles.position === 'absolute') {
            if (conversationListStyles.width === '200px') {
                dependentElement.style.left = "200px";
            } else {
                dependentElement.style.left = "300px";
            }
        }
    } else {
        conversationList.style.display = 'none';
        toggleIcon.classList.remove('navbar-rotate');
        if (conversationListStyles.position === 'absolute') {
            dependentElement.style.left = "0px";
        }
    }
}





document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('click', hideConversationMenu);
    const navbarElement = document.getElementById('navbar');
    const navbarToggleContainer = document.querySelector('.toggle-navbar-container');
    const themeToggleCheckbox = document.getElementById('theme-toggle');
    const root = document.documentElement;
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    themeToggleCheckbox.addEventListener('change', () => {
        if (themeToggleCheckbox.checked) {
            root.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
            iconSun.classList.replace('fa-solid', 'fa-regular');
            iconMoon.classList.replace('fa-regular', 'fa-solid');
        } else {
            root.setAttribute('data-theme', 'light');
            localStorage.setItem('theme', 'light');
            iconSun.classList.replace('fa-regular', 'fa-solid');
            iconMoon.classList.replace('fa-solid', 'fa-regular');
        }
    });

    const savedTheme = localStorage.getItem('theme') || 'light';
    root.setAttribute('data-theme', savedTheme);
    themeToggleCheckbox.checked = savedTheme === 'dark';

    // Uppdatera ikonernas utseende baserat på det sparade temat
    if (savedTheme === 'dark') {
        iconSun.classList.replace('fa-solid', 'fa-regular');
        iconMoon.classList.replace('fa-regular', 'fa-solid');
    } else {
        iconSun.classList.replace('fa-regular', 'fa-solid');
        iconMoon.classList.replace('fa-solid', 'fa-regular');
    }

    const navbarElementStyles = window.getComputedStyle(navbarElement);

    if (navbarElementStyles.display === 'flex' && navbarElementStyles.position === 'absolute') {
        if (navbarElementStyles.width === '200px') {
            navbarToggleContainer.style.left = "200px";
        } else {
            navbarToggleContainer.style.left = "300px";
        }
    } else {
        navbarToggleContainer.style.left = "0px";
    }

    window.addEventListener('resize', function () {
        // This function will be called whenever the window is resized
        console.log('Window size changed');

        // Add your logic here to handle the changes
        const navbarElement = document.getElementById('navbar');
        const navbarToggleContainer = document.querySelector('.toggle-navbar-container');
        const navbarElementStyle = window.getComputedStyle(navbarElement);

        if (navbarElementStyle.display === 'flex' && navbarElementStyle.position === 'absolute') {
            if (navbarElementStyles.width === '200px') {
                navbarToggleContainer.style.left = "200px";
            } else {
                navbarToggleContainer.style.left = "300px";
            }
        } else {
            navbarToggleContainer.style.left = "0px";
        }
    });

    const userInput = document.getElementById('userInput');

    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const message = userInput.value.trim();
            if (message) {
                sendMessage();
            }
        }
    });
    var modal = document.getElementById('myModal');
    var openModalButton = document.getElementById('openModalButton');
    var modalClose = document.getElementById('modalClose');
    var docButtons = document.querySelectorAll('.doc-btn');
    var pdfViewer = document.getElementById('pdfViewer');

    // Open the modal when the button is clicked
    openModalButton.addEventListener('click', function () {
        modal.style.display = 'block';
    });

    // Close the modal when the close button is clicked
    modalClose.addEventListener('click', function () {
        modal.style.display = 'none';
    });

    // Close the modal if clicking outside the modal container
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Switch documents on button click
    docButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            // Remove active from all buttons
            docButtons.forEach(function (b) {
                b.classList.remove('active');
            });
            // Set active on the clicked button
            this.classList.add('active');
            // Update the iframe to show the selected PDF
            pdfViewer.src = this.getAttribute('data-url');
        });
    });
    document.addEventListener('click', function (event) {
        const conversationList = document.getElementById('navbar');
        const toggleIcon = document.getElementById('toggle-navbar-icon');
        const dependentElement = document.querySelector('.toggle-navbar-container');
        const conversationListStyles = window.getComputedStyle(conversationList);

        // Only apply the close behavior if the navbar is absolute and visible
        if (conversationListStyles.position === 'absolute' && conversationList.style.display !== 'none') {
            // If the click target is not inside the navbar, toggle icon, or the dependent element, close the navbar.
            if (
                !conversationList.contains(event.target) &&
                !toggleIcon.contains(event.target) &&
                !dependentElement.contains(event.target)
            ) {
                conversationList.style.display = 'none';
                toggleIcon.classList.remove('navbar-rotate');
                dependentElement.style.left = "0px";
            }
        }
    });
});

function toggleSubmitButton() {
    const userInput = document.getElementById('userInput');
    const submitButton = document.getElementById('sendButton')
    submitButton.disabled = userInput.value.trim() === '';
}


function userInputOnInput() {
    const userInput = document.getElementById('userInput');
    adjustTextareaHeight(userInput);
    toggleSubmitButton();
}

function getCSRFToken() {
    return document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];
}


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function openUserOptions() {
    const userOptionContainer = document.getElementById('signed-in-options');
    if (userOptionContainer.style.display === 'none') {
        userOptionContainer.style.display = 'block';
    } else {
        userOptionContainer.style.display = 'none';
    }
}


function getConversationKeys() {
    return Object.keys(localStorage).filter(key => key.startsWith('conversation_'));
}

function getConversation(key) {
    return JSON.parse(localStorage.getItem(key));
}

function saveConversation(key, conversation) {
    localStorage.setItem(key, JSON.stringify(conversation));
}


function showConversations() {
    const conversationKeys = getConversationKeys();
    const conversationsDiv = document.getElementById('conversations');
    const favoriteConversationsDiv = document.getElementById('favorite-conversations');
    conversationsDiv.innerHTML = '';
    favoriteConversationsDiv.innerHTML = '';

    const groupedConversations = {
        'Today': [],
        'Yesterday': [],
        'Last Week': [],
        'Last Month': [],
        'Older': []
    };
    const favoriteConversations = [];

    console.log(conversationKeys)
    console.log(selectedConversationKey)

    conversationKeys.forEach(key => {
        const conversation = getConversation(key);
        if (conversation && selectedConversationKey != key && conversation.messages.length === 0) {
            localStorage.removeItem(key);
        } else {
            const createdAt = new Date(conversation.created_at);
            const label = getRelativeDateLabel(createdAt);
            if (conversation.isFavorite) {
                favoriteConversations.push({ key, conversation })
            } else {
                groupedConversations[label].push({ key, conversation })
            }
        }
    });
    console.log(groupedConversations)

    Object.keys(groupedConversations).forEach(label => {
        groupedConversations[label].sort((a, b) => new Date(b.conversation.created_at) - new Date(a.conversation.created_at));
    });
    favoriteConversations.sort((a, b) => new Date(b.conversation.created_at) - new Date(a.conversation.created_at));

    if (favoriteConversations.length > 0) {
        const favoriteLabelDiv = document.createElement('div');
        favoriteLabelDiv.classList.add('date-label');
        favoriteLabelDiv.innerText = 'Favorites';
        favoriteConversationsDiv.appendChild(favoriteLabelDiv)

        favoriteConversations.forEach(({ key, conversation }) => {
            const conversationDiv = document.createElement('div');
            conversationDiv.classList.add('conversation-item');
            conversationDiv.innerText = 'Favorites';
            if (key === selectedConversationKey) {
                conversationDiv.classList.add('active-conversation');
            }
            conversationDiv.innerHTML = `
            <div class="conversation-title" onclick="openConversation('${key}')>
                <p>${conversation.title}</p>
            </div>
            <div class="icon" onclick="showConversationMenu(event, '${key}')">
                <i class ="fa fa-ellipsis-v fa-rotate-90></i>
            </div> 
            `;
            favoriteConversationsDiv.appendChild(conversationDiv);
        })
    }
    Object.keys(groupedConversations).forEach(label => {
        if (groupedConversations[label].length > 0) {
            const dateLabelDiv = document.createElement('div');
            dateLabelDiv.classList.add('date-label');
            dateLabelDiv.innerText = label;
            conversationsDiv.appendChild(dateLabelDiv)
            groupedConversations[label].forEach(({ key, conversation }) => {
                const conversationDiv = document.createElement('div');
                conversationDiv.classList.add('conversation-item');
                conversationDiv.setAttribute('data-conversation-id', key);
                if (key === selectedConversationKey) {
                    conversationDiv.classList.add('active-conversation');
                }
                conversationDiv.innerHTML = `
                <div class="conversation-title" onclick="openConversation('${key}')">
                    <p>${conversation.title}</p>
                </div>
                <div class="icon" onclick="showConversationMenu(event, '${key}')">
                    <i class="fa fa-ellipsis-v fa-rotate-90"></i>
                </div> 
                `;
                conversationsDiv.appendChild(conversationDiv);
            })
        }
    })
}

// Escape special HTML characters to prevent HTML injection
function escapeHTML(str) {
    return str.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function showMessages(messages) {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';
    if (messages.length === 0) {
        showWelcomeMessage();
        showConversationStarters();
    } else {
        const convStarters = document.querySelector('.conversation-starters');
        if (convStarters) {
            convStarters.remove();
        }
    }
    messages.forEach(msg => {
        const messageContainerDiv = document.createElement('div');
        messageContainerDiv.classList.add(
            msg.role === 'assistant' ? `${msg.role}-response-container` : `${msg.role}-message-container`
        );

        // Prepare extra content for assistant messages
        let extraContent = '';
        if (msg.role === 'assistant') {
            if (msg.sources && msg.sources.length > 0) {
                extraContent = `
                  <button class="toggle-button">
                    Show Sources <i class="fa-solid fa-angle-right"></i>
                  </button>
                  <div class="sources-list">
                    <ul>
                      ${msg.sources.map(source => `<li><a href="${source.url}">${source.document_name}</a></li>`).join('')}
                    </ul>
                  </div>
                  <div class="message-side-container">
                    <div class="message-side-button-container"></div>
                  </div>
                `;
            } else {
                extraContent = `
                  <div class="message-side-container">
                    <div class="message-side-button-container"></div>
                  </div>
                `;
            }
        }
        console.log(msg.text)
        // For assistant messages, use md.render, for user messages, escape HTML before inserting.
        messageContainerDiv.innerHTML = `
        <div class="${msg.role === 'assistant' ? 'assistant-response' : 'user-message'}">
          ${msg.role === 'assistant'
                ? md.render(msg.text)
                : `<p>${escapeHTML(msg.text.trim())}</p>`
            }
        </div>
        ${msg.role === 'assistant' ? extraContent : ''}
      `;


        messagesDiv.appendChild(messageContainerDiv);

        if (msg.role === 'assistant') {
            const buttonContainer = messageContainerDiv.querySelector('.message-side-button-container');
            createCopyButtons(buttonContainer, messageContainerDiv);

            // If sources exist, set up toggle functionality and add click listeners to source links
            if (msg.sources && msg.sources.length > 0) {
                const toggleButton = messageContainerDiv.querySelector('.toggle-button');
                const sourcesList = messageContainerDiv.querySelector('.sources-list');
                // Hide the sources list by default
                sourcesList.style.display = 'none';
                toggleButton.addEventListener('click', () => {
                    if (sourcesList.style.display === 'none' || sourcesList.style.display === '') {
                        sourcesList.style.display = 'block';
                        toggleButton.innerHTML = 'Hide Sources <i class="fa-solid fa-angle-down"></i>';
                        sourcesList.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    } else {
                        sourcesList.style.display = 'none';
                        toggleButton.innerHTML = 'Show Sources <i class="fa-solid fa-angle-right"></i>';
                    }
                });

                // Add click listeners to each source link
                const sourceLinks = messageContainerDiv.querySelectorAll('.sources-list a');
                sourceLinks.forEach(link => {
                    link.addEventListener('click', function (e) {
                        e.preventDefault();
                        const url = this.getAttribute('href');
                        openDocumentInModal(url);
                    });
                });
            }
        }
    });
    scrollToBottom();
}



function showWelcomeMessage() {
    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = `
    <div class="welcome-message">
        <div class="welcome-message-container">
            <h3 style="text-align: center;">Welcome to Niclas CV chatbot</h3> <br>
            <p>Welcome! I'm your personal Resume ChatBot, built with state-of-the-art retrieval-augmented generation (RAG) technology. I can help you explore my professional journey—from my CV and key achievements to insights about past projects and work experiences. Ask me anything about my background, skills, or milestones, and I'll provide the detailed information you need. Let's get started!</p>
        </div>
    </div>
    `;
}

function setActiveConversationLocalKey(key) {
    selectedConversationKey = key;
    localStorage.setItem('active_conversation', key);
}

function getActiveConversationKey() {
    return localStorage.getItem('active_conversation');
}

function startNewConversation() {
    const key = `conversation_${Date.now()}`;
    const newConversation = { title: 'New Conversation', created_at: new Date().toISOString(), messages: [] };
    saveConversation(key, newConversation);
    setActiveConversationLocalKey(key);
    openConversation(key);
}

function openConversation(key) {
    const conversation = getConversation(key);
    console.log(conversation)
    if (conversation) {
        document.getElementById('userInput').dataset.conversationKey = key;
        setActiveConversationLocalKey(key);
        showMessages(conversation.messages);
        showConversations();
    } else {
        console.error(`Conversation with key ${key} does not exist.`);
    }
}

async function sendMessage() {
    const messageInput = document.getElementById('userInput');
    const message = messageInput.value;
    if (message) {
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const convStarters = document.querySelector('.conversation-starters');
        if (convStarters) {
            convStarters.remove();
        }

        const key = messageInput.dataset.conversationKey;
        const conversation = getConversation(key);
        const trimmedConversation = conversation.messages.slice(-5);

        const newMessage = { role: 'user', text: message, created_at: new Date().toISOString() };
        conversation.messages.push(newMessage);
        saveConversation(key, conversation);
        messageInput.value = '';
        adjustTextareaHeight(messageInput);
        addMessage(message, 'user');

        const messagesDiv = document.getElementById('messages');

        // Create temporary assistant message container
        const tempMessageContainerDiv = document.createElement('div');
        tempMessageContainerDiv.classList.add('assistant-response-container');
        tempMessageContainerDiv.innerHTML = `
            <div class="assistant-response"></div>
            <div class="message-side-container">
                <div class="message-side-button-container"></div>
            </div>
        `;
        messagesDiv.appendChild(tempMessageContainerDiv);

        const tempMessageDiv = tempMessageContainerDiv.querySelector('.assistant-response');
        const buttonContainer = tempMessageContainerDiv.querySelector('.message-side-button-container');

        let fastForward = false; // Flag to handle fast-forwarding
        let collectedSources = []; // This will hold sources if they are sent

        // Add a fast-forward button
        buttonContainer.innerHTML = `
            <button class="forward-arrow">
                <i class="fa-solid fa-forward"></i>
            </button>
        `;
        const fastForwardButton = buttonContainer.querySelector('.forward-arrow');
        fastForwardButton.addEventListener('click', () => {
            fastForward = true;
        });
        scrollToBottom();

        try {
            const response = await fetch('/chat/chat_api/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCSRFToken()
                },
                body: JSON.stringify({ message: message, conversation: trimmedConversation }),
            });

            const reader = response.body.getReader();
            let decoder = new TextDecoder('utf-8');
            let buffer = '';
            let collectedMessage = '';
            const createdAt = new Date().toISOString();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                let lines = buffer.split('\n');
                buffer = lines.pop();
                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine) {
                        try {
                            const data = JSON.parse(trimmedLine);
                            if (data.role === 'assistant') {
                                collectedMessage += data.message;
                                tempMessageDiv.innerHTML = md.render(collectedMessage);
                                renderMathInElement(tempMessageDiv);
                                scrollOnMessage();
                                if (!fastForward) {
                                    await sleep(10);
                                }
                            } else if (data.role === 'assistant_sources') {
                                // Save sources for later storage
                                collectedSources = data.sources || [];

                                // Build the toggleable sources UI
                                const sourcesListDiv = document.createElement('div');
                                sourcesListDiv.classList.add('sources-list');
                                sourcesListDiv.style.display = 'none';

                                let listHtml = '<ul>';
                                collectedSources.forEach(source => {
                                    // Remove target attribute since we handle click
                                    listHtml += `<li><a href="${source.url}">${source.document_name}</a></li>`;
                                });
                                listHtml += '</ul>';
                                sourcesListDiv.innerHTML = listHtml;

                                // Create a toggle button for the sources list
                                const toggleButton = document.createElement('button');
                                toggleButton.innerHTML = 'Show Sources <i class="fa-solid fa-angle-right"></i>';
                                toggleButton.classList.add('toggle-button');
                                toggleButton.addEventListener('click', () => {
                                    if (sourcesListDiv.style.display === 'none' || sourcesListDiv.style.display === '') {
                                        sourcesListDiv.style.display = 'block';
                                        toggleButton.innerHTML = 'Hide Sources <i class="fa-solid fa-angle-down"></i>';
                                        sourcesListDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
                                    } else {
                                        sourcesListDiv.style.display = 'none';
                                        toggleButton.innerHTML = 'Show Sources <i class="fa-solid fa-angle-right"></i>';
                                    }
                                });

                                // Append the toggle button and sources list below the assistant response
                                tempMessageContainerDiv.appendChild(toggleButton);
                                tempMessageContainerDiv.appendChild(sourcesListDiv);

                                // Add click event to each source link to open the document in the modal
                                const sourceLinks = sourcesListDiv.querySelectorAll('a');
                                sourceLinks.forEach(link => {
                                    link.addEventListener('click', function (e) {
                                        e.preventDefault();
                                        const url = this.getAttribute('href');
                                        openDocumentInModal(url);
                                    });
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing line:', trimmedLine, e);
                        }
                    }
                }
            }

            fastForwardButton.remove();
            scrollOnMessage();

            // Save the final assistant message with collected sources (or empty array if none)
            const assistantMessage = {
                role: 'assistant',
                text: collectedMessage,
                created_at: createdAt,
                sources: collectedSources
            };
            conversation.messages.push(assistantMessage);
            saveConversation(key, conversation);

            createCopyButtons(buttonContainer, tempMessageContainerDiv);

        } catch (error) {
            alert('Error: ' + error.message);
        }
    }
}


function initializePage() {
    const activeConversationKey = getActiveConversationKey();
    console.log(activeConversationKey)
    if (activeConversationKey && getConversation(activeConversationKey)) {
        openConversation(activeConversationKey);
    } else {
        startNewConversation();
    }
}

function getRelativeDateLabel(date) {
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const diff = now - date;

    const isSameDay = (d1, d2) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    if (isSameDay(now, date)) {
        return 'Today';
    } else if (isSameDay(new Date(now - oneDay), date)) {
        return 'Yesterday';
    } else if (diff < oneWeek) {
        return 'Last Week';
    } else if (diff < oneMonth) {
        return 'Last Month';
    } else {
        return 'Older';
    }
}


function addMessage(message, role) {
    const messagesDiv = document.getElementById('messages');

    const messageContainerDiv = document.createElement('div');
    messageContainerDiv.classList.add(`${role === 'assistant' ? `${role}-response-container` : `${role}-message-container`}`);

    messageContainerDiv.innerHTML = `
        <div class="${role === 'assistant' ? `${role}-response` : `${role}-message`}">
            <p>${message}</p>
        </div>
    `;

    messagesDiv.appendChild(messageContainerDiv);
}


function userInputKeypress(event) {
    const userInput = document.getElementById('userInput');
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const message = userInput.value.trim();
        if (message) {
            sendMessage();
            toggleSubmitButton();
        }
    }
}

function openDocumentInModal(url) {
    // Get the modal, PDF viewer, and all document buttons
    const modal = document.getElementById('myModal');
    const pdfViewer = document.getElementById('pdfViewer');
    const docButtons = document.querySelectorAll('.doc-btn');

    // Open the modal
    modal.style.display = 'block';

    // Update the PDF viewer source
    pdfViewer.src = url;

    // Loop through the document buttons to update the active state
    docButtons.forEach(btn => {
        if (btn.getAttribute('data-url') === url) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}


function showConversationStarters() {
    const inputContainer = document.querySelector('.input-container');
    // Only insert if not already present
    if (!document.querySelector('.conversation-starters')) {
        const conversationStartersHTML = `
            <div class="conversation-starters">
                <button class="starter-btn" onclick="selectConversationStarter('Tell me about your background.')">
                    Tell me about your background.
                </button>
                <button class="starter-btn" onclick="selectConversationStarter('What are your key achievements?')">
                    What are your key achievements?
                </button>
                <button class="starter-btn" onclick="selectConversationStarter('Can you describe one of your projects?')">
                    Can you describe one of your projects?
                </button>
            </div>
        `;
        // Insert above the input container
        inputContainer.insertAdjacentHTML('beforebegin', conversationStartersHTML);
    }
}


function selectConversationStarter(text) {
    const messageInput = document.getElementById('userInput');
    messageInput.value = text;
}


function scrollToBottom() {
    const messagesDiv = document.querySelector('.chat-container');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}


function scrollOnMessage() {
    const chatContainer = document.querySelector('.chat-container');
    const threshold = 50; // pixels from bottom to auto-scroll
    const distanceFromBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight;
    if (distanceFromBottom <= threshold) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

function isToggleInLastAssistantMessage(toggleButton) {
    const chatContainer = document.querySelector('.chat-container');
    return chatContainer.lastElementChild.contains(toggleButton);
}