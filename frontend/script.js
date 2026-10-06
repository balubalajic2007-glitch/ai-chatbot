/* ==========================================
   NOVA AI FRONTEND
========================================== */


/* ==========================================
   ELEMENTS
========================================== */


const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});







const chatArea =
    document.getElementById("chatArea");

const messagesContainer =
    document.getElementById("messages");

const welcome =
    document.getElementById("welcome");

const messageInput =
    document.getElementById("messageInput");

const sendBtn =
    document.getElementById("sendBtn");

const newChatBtn =
    document.getElementById("newChatBtn");

const clearBtn =
    document.getElementById("clearBtn");

const chatHistory =
    document.getElementById("chatHistory");

const themeBtn =
    document.getElementById("themeBtn");

const themeIcon =
    document.getElementById("themeIcon");

const themeText =
    document.getElementById("themeText");

const menuBtn =
    document.getElementById("menuBtn");

const closeSidebar =
    document.getElementById("closeSidebar");

const sidebar =
    document.getElementById("sidebar");

const overlay =
    document.getElementById("overlay");


/* ==========================================
   STATE
========================================== */

let conversations =
    JSON.parse(
        localStorage.getItem(
            "nova-conversations"
        )
    ) || [];

let currentConversationId =
    localStorage.getItem(
        "nova-current-conversation"
    );

let isGenerating = false;


/* ==========================================
   CREATE ID
========================================== */

function createId() {

    return (
        Date.now().toString(36) +
        Math.random()
            .toString(36)
            .substring(2, 8)
    );

}


/* ==========================================
   CREATE NEW CONVERSATION
========================================== */

function createConversation() {

    const conversation = {

        id: createId(),

        title: "New Chat",

        messages: [],

        createdAt: Date.now()

    };


    conversations.unshift(
        conversation
    );


    currentConversationId =
        conversation.id;


    saveConversations();

    renderHistory();

    renderCurrentConversation();

}


/* ==========================================
   GET CURRENT CONVERSATION
========================================== */

function getCurrentConversation() {

    return conversations.find(
        conversation =>
            conversation.id ===
            currentConversationId
    );

}


/* ==========================================
   SAVE
========================================== */

function saveConversations() {

    localStorage.setItem(

        "nova-conversations",

        JSON.stringify(conversations)

    );


    localStorage.setItem(

        "nova-current-conversation",

        currentConversationId || ""

    );

}


/* ==========================================
   RENDER HISTORY
========================================== */

function renderHistory() {

    chatHistory.innerHTML = "";


    conversations.forEach(
        conversation => {

            const item =
                document.createElement("div");


            item.className =
                "chat-history-item";


            if (
                conversation.id ===
                currentConversationId
            ) {

                item.classList.add(
                    "active"
                );

            }


            item.innerHTML = `

                <span>💬</span>

                <span class="history-name">
                    ${escapeHTML(
                        conversation.title
                    )}
                </span>

                <button
                    class="delete-history"
                    title="Delete chat"
                >
                    ×
                </button>

            `;


            item.addEventListener(
                "click",
                () => {

                    currentConversationId =
                        conversation.id;

                    saveConversations();

                    renderHistory();

                    renderCurrentConversation();

                    closeMobileSidebar();

                }
            );


            const deleteButton =
                item.querySelector(
                    ".delete-history"
                );


            deleteButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    deleteConversation(
                        conversation.id
                    );

                }
            );


            chatHistory.appendChild(item);

        }
    );

}


/* ==========================================
   DELETE CONVERSATION
========================================== */

function deleteConversation(id) {

    conversations =
        conversations.filter(
            conversation =>
                conversation.id !== id
        );


    if (
        currentConversationId === id
    ) {

        if (conversations.length > 0) {

            currentConversationId =
                conversations[0].id;

        } else {

            createConversation();

            return;

        }

    }


    saveConversations();

    renderHistory();

    renderCurrentConversation();

}


/* ==========================================
   RENDER CURRENT CHAT
========================================== */

function renderCurrentConversation() {

    messagesContainer.innerHTML = "";


    const conversation =
        getCurrentConversation();


    if (
        !conversation ||
        conversation.messages.length === 0
    ) {

        welcome.style.display = "block";

        return;

    }


    welcome.style.display = "none";


    conversation.messages.forEach(
        message => {

            addMessageToUI(
                message.role,
                message.content
            );

        }
    );


    scrollToBottom();

}


/* ==========================================
   ADD MESSAGE UI
========================================== */

function addMessageToUI(
    role,
    content,
    streaming = false
) {

    const message =
        document.createElement("div");


    message.className =
        `message ${role === "user"
            ? "user"
            : "ai"}`;


    const avatar =
        role === "user"
            ? "👤"
            : "✦";


    const avatarClass =
        role === "user"
            ? "user-avatar"
            : "ai-avatar";


    message.innerHTML = `

        <div class="avatar ${avatarClass}">
            ${avatar}
        </div>

        <div class="message-body">

            <div class="message-content">
                ${
                    role === "user"
                        ? escapeHTML(content)
                        : formatAI(content)
                }
            </div>

            ${
                role === "assistant"
                    ? `
                        <div class="message-actions">

                            <button
                                class="message-action copy-message"
                            >
                                📋 Copy
                            </button>

                            <button
                                class="message-action regenerate-message"
                            >
                                ↻ Regenerate
                            </button>

                        </div>
                    `
                    : ""
            }

        </div>

    `;


    messagesContainer.appendChild(
        message
    );


    const copyButton =
        message.querySelector(
            ".copy-message"
        );


    if (copyButton) {

        copyButton.addEventListener(
            "click",
            () => {

                navigator.clipboard.writeText(
                    content
                );


                copyButton.textContent =
                    "✓ Copied";


                setTimeout(
                    () => {

                        copyButton.textContent =
                            "📋 Copy";

                    },
                    1500
                );

            }
        );

    }


    const regenerateButton =
        message.querySelector(
            ".regenerate-message"
        );


    if (regenerateButton) {

        regenerateButton.addEventListener(
            "click",
            () => {

                regenerateResponse(
                    message
                );

            }
        );

    }


    if (!streaming) {

        scrollToBottom();

    }


    return message;

}


/* ==========================================
   SEND MESSAGE
========================================== */

async function sendMessage() {

    if (isGenerating) {
        return;
    }


    const text =
        messageInput.value.trim();


    if (!text) {
        return;
    }


    let conversation =
        getCurrentConversation();


    if (!conversation) {

        createConversation();

        conversation =
            getCurrentConversation();

    }


    /* -------------------------------
       USER MESSAGE
    ------------------------------- */

    conversation.messages.push({

        role: "user",

        content: text

    });


    /* -------------------------------
       CHAT TITLE
    ------------------------------- */

    if (
        conversation.title ===
        "New Chat"
    ) {

        conversation.title =
            createChatTitle(text);

    }


    saveConversations();

    renderHistory();


    welcome.style.display = "none";


    addMessageToUI(
        "user",
        text
    );


    messageInput.value = "";

    autoResize();


    /* -------------------------------
       DISABLE INPUT
    ------------------------------- */

    setGenerating(true);


    /* -------------------------------
       CREATE AI MESSAGE
    ------------------------------- */

    const aiMessage =
        document.createElement("div");


    aiMessage.className =
        "message ai";


    aiMessage.innerHTML = `

        <div class="avatar ai-avatar">
            ✦
        </div>

        <div class="message-body">

            <div class="message-content">

                <div class="typing">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        </div>

    `;


    messagesContainer.appendChild(
        aiMessage
    );


    const aiContent =
        aiMessage.querySelector(
            ".message-content"
        );


    let fullResponse = "";


    try {

        /* ---------------------------
           SEND TO BACKEND
        --------------------------- */

        const response =
            await fetch(
                "/api/chat",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        messages:
                            conversation.messages

                    })

                }
            );


        if (!response.ok) {

            const errorData =
                await response
                    .json()
                    .catch(() => null);


            throw new Error(
                errorData?.error ||
                "Server error"
            );

        }


        /* ---------------------------
           STREAM
        --------------------------- */

        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder();


        let buffer = "";


        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const events =
                buffer.split("\n\n");


            buffer =
                events.pop();


            for (
                const event
                of events
            ) {

                if (
                    !event.startsWith(
                        "data:"
                    )
                ) {

                    continue;

                }


                const jsonText =
                    event
                        .replace(
                            "data:",
                            ""
                        )
                        .trim();


                if (!jsonText) {
                    continue;
                }


                const data =
                    JSON.parse(
                        jsonText
                    );


                if (
                    data.type ===
                    "delta"
                ) {

                    fullResponse +=
                        data.text;


                    aiContent.innerHTML =
                        formatAI(
                            fullResponse
                        );


                    scrollToBottom();

                }


                if (
                    data.type ===
                    "error"
                ) {

                    throw new Error(
                        data.message
                    );

                }

            }

        }


        /* ---------------------------
           SAVE AI RESPONSE
        --------------------------- */

        conversation.messages.push({

            role: "assistant",

            content: fullResponse

        });


        saveConversations();


        /* ---------------------------
           ADD ACTION BUTTONS
        --------------------------- */

        aiMessage.innerHTML = `

            <div class="avatar ai-avatar">
                ✦
            </div>

            <div class="message-body">

                <div class="message-content">
                    ${formatAI(
                        fullResponse
                    )}
                </div>

                <div class="message-actions">

                    <button
                        class="message-action copy-message"
                    >
                        📋 Copy
                    </button>

                    <button
                        class="message-action regenerate-message"
                    >
                        ↻ Regenerate
                    </button>

                </div>

            </div>

        `;


        attachMessageActions(
            aiMessage,
            fullResponse
        );


    } catch (error) {

        console.error(error);


        aiContent.innerHTML =
            `<strong>Error:</strong><br>
            ${escapeHTML(
                error.message
            )}<br><br>
            Check that your backend is running
            and your API key is configured correctly.`;


    } finally {

        setGenerating(false);

        scrollToBottom();

    }

}


/* ==========================================
   MESSAGE ACTIONS
========================================== */

function attachMessageActions(
    element,
    content
) {

    const copyButton =
        element.querySelector(
            ".copy-message"
        );


    if (copyButton) {

        copyButton.addEventListener(
            "click",
            () => {

                navigator.clipboard.writeText(
                    content
                );


                copyButton.textContent =
                    "✓ Copied";


                setTimeout(
                    () => {

                        copyButton.textContent =
                            "📋 Copy";

                    },
                    1500
                );

            }
        );

    }


    const regenerateButton =
        element.querySelector(
            ".regenerate-message"
        );


    if (regenerateButton) {

        regenerateButton.addEventListener(
            "click",
            () => {

                regenerateResponse(
                    element
                );

            }
        );

    }

}


/* ==========================================
   REGENERATE
========================================== */

async function regenerateResponse(
    messageElement
) {

    if (isGenerating) {
        return;
    }


    const conversation =
        getCurrentConversation();


    if (!conversation) {
        return;
    }


    if (
        conversation.messages.length === 0
    ) {

        return;

    }


    const lastMessage =
        conversation.messages[
            conversation.messages.length - 1
        ];


    if (
        lastMessage.role !==
        "assistant"
    ) {

        return;

    }


    conversation.messages.pop();


    saveConversations();


    renderCurrentConversation();


    /* Find the last user message */

    const lastUserMessage =
        conversation.messages[
            conversation.messages.length - 1
        ];


    if (
        !lastUserMessage ||
        lastUserMessage.role !==
        "user"
    ) {

        return;

    }


    setGenerating(true);


    const aiMessage =
        document.createElement("div");


    aiMessage.className =
        "message ai";


    aiMessage.innerHTML = `

        <div class="avatar ai-avatar">
            ✦
        </div>

        <div class="message-body">

            <div class="message-content">

                <div class="typing">

                    <span></span>
                    <span></span>
                    <span></span>

                </div>

            </div>

        </div>

    `;


    messagesContainer.appendChild(
        aiMessage
    );


    const aiContent =
        aiMessage.querySelector(
            ".message-content"
        );


    let fullResponse = "";


    try {

        const response =
            await fetch(
                "/api/chat",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body: JSON.stringify({

                        messages:
                            conversation.messages

                    })

                }
            );


        if (!response.ok) {

            throw new Error(
                "Unable to regenerate response."
            );

        }


        const reader =
            response.body.getReader();


        const decoder =
            new TextDecoder();


        let buffer = "";


        while (true) {

            const {
                value,
                done
            } =
                await reader.read();


            if (done) {
                break;
            }


            buffer +=
                decoder.decode(
                    value,
                    {
                        stream: true
                    }
                );


            const events =
                buffer.split("\n\n");


            buffer =
                events.pop();


            for (
                const event
                of events
            ) {

                if (
                    !event.startsWith(
                        "data:"
                    )
                ) {

                    continue;

                }


                const data =
                    JSON.parse(
                        event
                            .replace(
                                "data:",
                                ""
                            )
                            .trim()
                    );


                if (
                    data.type ===
                    "delta"
                ) {

                    fullResponse +=
                        data.text;


                    aiContent.innerHTML =
                        formatAI(
                            fullResponse
                        );


                    scrollToBottom();

                }

            }

        }


        conversation.messages.push({

            role: "assistant",

            content: fullResponse

        });


        saveConversations();


        aiMessage.innerHTML = `

            <div class="avatar ai-avatar">
                ✦
            </div>

            <div class="message-body">

                <div class="message-content">
                    ${formatAI(
                        fullResponse
                    )}
                </div>

                <div class="message-actions">

                    <button
                        class="message-action copy-message"
                    >
                        📋 Copy
                    </button>

                    <button
                        class="message-action regenerate-message"
                    >
                        ↻ Regenerate
                    </button>

                </div>

            </div>

        `;


        attachMessageActions(
            aiMessage,
            fullResponse
        );


    } catch (error) {

        aiContent.innerHTML =
            escapeHTML(
                error.message
            );

    } finally {

        setGenerating(false);

    }

}


/* ==========================================
   SET GENERATING
========================================== */

function setGenerating(value) {

    isGenerating = value;

    sendBtn.disabled = value;

    messageInput.disabled = value;

}


/* ==========================================
   CREATE CHAT TITLE
========================================== */

function createChatTitle(text) {

    const clean =
        text
            .replace(/\s+/g, " ")
            .trim();


    if (
        clean.length <= 30
    ) {

        return clean;

    }


    return (
        clean.substring(0, 30) +
        "..."
    );

}


/* ==========================================
   MARKDOWN FORMATTER
========================================== */

function formatAI(text) {

    if (!text) {
        return "";
    }


    let html =
        escapeHTML(text);


    /* CODE BLOCKS */

    html =
        html.replace(

            /```([\s\S]*?)```/g,

            (match, code) => {

                return `
                    <pre class="code-block">
                        <code>${code.trim()}</code>
                    </pre>
                `;

            }

        );


    /* HEADINGS */

    html =
        html.replace(
            /^### (.*)$/gm,
            "<h3>$1</h3>"
        );


    html =
        html.replace(
            /^## (.*)$/gm,
            "<h2>$1</h2>"
        );


    /* BOLD */

    html =
        html.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /* INLINE CODE */

    html =
        html.replace(
            /`([^`]+)`/g,
            '<span class="inline-code">$1</span>'
        );


    /* BULLET LIST */

    html =
        html.replace(
            /^\s*[-*] (.*)$/gm,
            "<li>$1</li>"
        );


    html =
        html.replace(
            /(<li>.*<\/li>)/gs,
            "<ul>$1</ul>"
        );


    /* NUMBERED LIST */

    html =
        html.replace(
            /^\s*\d+\. (.*)$/gm,
            "<li>$1</li>"
        );


    /* NEW LINES */

    html =
        html.replace(
            /\n/g,
            "<br>"
        );


    return html;

}


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}


/* ==========================================
   SCROLL
========================================== */

function scrollToBottom() {

    chatArea.scrollTop =
        chatArea.scrollHeight;

}


/* ==========================================
   TEXTAREA AUTO RESIZE
========================================== */

function autoResize() {

    messageInput.style.height =
        "auto";


    messageInput.style.height =
        Math.min(
            messageInput.scrollHeight,
            150
        ) + "px";

}


messageInput.addEventListener(
    "input",
    autoResize
);


/* ==========================================
   ENTER TO SEND
========================================== */

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();

        }

    }
);


/* ==========================================
   SEND BUTTON
========================================== */

sendBtn.addEventListener(
    "click",
    sendMessage
);


/* ==========================================
   SUGGESTIONS
========================================== */

document
    .querySelectorAll(".suggestion")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const prompt =
                    button.dataset.prompt;


                messageInput.value =
                    prompt;


                autoResize();

                sendMessage();

            }
        );

    });


/* ==========================================
   NEW CHAT
========================================== */

newChatBtn.addEventListener(
    "click",
    () => {

        createConversation();

        closeMobileSidebar();

        messageInput.focus();

    }
);


/* ==========================================
   CLEAR CURRENT CHAT
========================================== */

clearBtn.addEventListener(
    "click",
    () => {

        const conversation =
            getCurrentConversation();


        if (!conversation) {
            return;
        }


        conversation.messages = [];

        conversation.title =
            "New Chat";


        saveConversations();

        renderHistory();

        renderCurrentConversation();

        messageInput.focus();

    }
);


/* ==========================================
   THEME
========================================== */

themeBtn.addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "light"
        );


        const light =
            document.body.classList.contains(
                "light"
            );


        if (light) {

            themeIcon.textContent =
                "☀️";

            themeText.textContent =
                "Light Mode";

            localStorage.setItem(
                "nova-theme",
                "light"
            );

        } else {

            themeIcon.textContent =
                "🌙";

            themeText.textContent =
                "Dark Mode";

            localStorage.setItem(
                "nova-theme",
                "dark"
            );

        }

    }
);


/* ==========================================
   LOAD THEME
========================================== */

if (
    localStorage.getItem(
        "nova-theme"
    ) === "light"
) {

    document.body.classList.add(
        "light"
    );

    themeIcon.textContent =
        "☀️";

    themeText.textContent =
        "Light Mode";

}


/* ==========================================
   MOBILE SIDEBAR
========================================== */

menuBtn.addEventListener(
    "click",
    () => {

        sidebar.classList.add(
            "open"
        );

        overlay.classList.add(
            "show"
        );

    }
);


closeSidebar.addEventListener(
    "click",
    closeMobileSidebar
);


overlay.addEventListener(
    "click",
    closeMobileSidebar
);


function closeMobileSidebar() {

    sidebar.classList.remove(
        "open"
    );

    overlay.classList.remove(
        "show"
    );

}


/* ==========================================
   INITIALIZE
========================================== */

function initialize() {

    if (
        conversations.length === 0
    ) {

        createConversation();

        return;

    }


    const currentExists =
        conversations.some(
            conversation =>
                conversation.id ===
                currentConversationId
        );


    if (!currentExists) {

        currentConversationId =
            conversations[0].id;

    }


    saveConversations();

    renderHistory();

    renderCurrentConversation();

}


initialize();