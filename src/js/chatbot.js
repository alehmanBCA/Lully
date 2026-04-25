document.addEventListener('DOMContentLoaded', () => {
  const chatbot = document.querySelector('[data-chatbot]');
  if (!chatbot) {
    return;
  }

  const elements = {
    toggleButton: chatbot.querySelector('[data-chatbot-toggle]'),
    closeButton: chatbot.querySelector('[data-chatbot-close]'),
    overlay: chatbot.querySelector('[data-chatbot-overlay]'),
    panel: chatbot.querySelector('[data-chatbot-panel]'),
    messages: chatbot.querySelector('[data-chatbot-messages]'),
    form: chatbot.querySelector('[data-chatbot-form]'),
    input: chatbot.querySelector('[data-chatbot-input]')
  };

  const botText = {
    greeting: 'Hi, I’m Lully. I can help with profile setup, monitor usage, account updates, login/signup, and troubleshooting.',
    empty: 'Ask me about Lully and I will help.',
    unsafe: 'I can only help with safe questions about Lully and the site.',
    fallbackSite: 'I can help with Lully setup and usage. Ask about adding or deleting baby profiles, monitor readings, login/signup, account edits, or troubleshooting.',
    fallbackGeneral: 'I can only answer Lully-related questions. Try asking: what Lully does, how to add or remove a baby profile, how monitor readings work, how to edit account, or how to troubleshoot.'
  };

  const blockedPatterns = [
    /sex/i,
    /nude/i,
    /porn/i,
    /violence/i,
    /kill/i,
    /suicide/i,
    /drugs?/i,
    /weapon/i,
    /hack/i,
    /bypass/i,
    /bomb/i,
    /hate/i
  ];

  const tokenAliases = {
    signin: 'login',
    signon: 'login',
    register: 'signup',
    registration: 'signup',
    pfp: 'picture',
    pic: 'picture',
    photo: 'picture',
    temps: 'temperature',
    temp: 'temperature',
    kid: 'baby',
    child: 'baby',
    infant: 'baby'
  };

  const siteTerms = ['lully', 'dashboard', 'profile', 'monitor', 'baby', 'login', 'signup', 'account', 'site', 'app', 'parent'];

  const intentRules = [
    {
      id: 'about-lully',
      minScore: 2,
      keywords: ['lully', 'about', 'what', 'can', 'do', 'features', 'purpose', 'app', 'site', 'platform'],
      patterns: [/what\s+is\s+lully/i, /about\s+lully/i, /what\s+can.*lully/i, /who\s+are\s+you/i, /what\s+does\s+lully\s+do/i],
      answer: 'Lully is a baby-monitoring web app. You can create baby profiles, open each baby monitor dashboard, and track heart rate and temperature in one place.'
    },
    {
      id: 'bot-capabilities',
      minScore: 3,
      keywords: ['help', 'support', 'questions', 'ask', 'you', 'can', 'do'],
      patterns: [/what\s+can\s+you\s+help\s+with/i, /what\s+can\s+i\s+ask/i, /how\s+can\s+you\s+help/i],
      answer: 'I can help with Lully navigation and tasks: creating baby profiles, opening monitor pages, reading monitor metrics, updating account info, logging in/signing up, and troubleshooting common issues.'
    },
    {
      id: 'add-baby',
      minScore: 2,
      keywords: ['add', 'create', 'new', 'baby', 'profile', 'child', 'infant'],
      patterns: [/add.*baby/i, /new.*baby/i, /baby.*profile/i, /create.*profile/i],
      answer: 'On the Profile page, click Add Baby Profile. Fill in the baby details, save, then use View Monitor on that card.'
    },
    {
      id: 'delete-baby',
      minScore: 2,
      keywords: ['delete', 'remove', 'trash', 'baby', 'profile', 'card'],
      patterns: [/delete.*baby/i, /remove.*baby/i, /trash/i],
      answer: 'On the Profile page, use the trash icon on a baby card to remove that profile. If nothing happens, refresh and try once more.'
    },
    {
      id: 'monitor',
      minScore: 2,
      keywords: ['monitor', 'reading', 'heart', 'temperature', 'stats', 'vitals', 'dashboard'],
      patterns: [/monitor/i, /heart\s*rate/i, /temperature/i, /vitals?/i, /readings?/i],
      answer: 'Open a baby card and click View Monitor. You can see heart rate and baby temperature there.'
    },
    {
      id: 'monitor-meaning',
      minScore: 3,
      keywords: ['mean', 'means', 'normal', 'high', 'low', 'reading', 'heart', 'temperature'],
      patterns: [/what\s+does.*mean/i, /is.*normal/i, /too\s+high/i, /too\s+low/i],
      answer: 'I can explain where to find each monitor value, but I cannot give medical advice. For interpretation of normal or abnormal values, please contact a qualified healthcare professional.'
    },
    {
      id: 'account',
      minScore: 2,
      keywords: ['account', 'edit', 'update', 'name', 'picture', 'photo', 'profile', 'avatar'],
      patterns: [/edit.*account/i, /update.*account/i, /profile\s*picture/i, /change.*name/i],
      answer: 'Use the account box at the top-right of the Profile page, then open Edit Account to change your display name or profile picture.'
    },
    {
      id: 'auth',
      minScore: 2,
      keywords: ['login', 'log', 'sign', 'signup', 'password', 'account', 'register', 'signin', 'forgot'],
      patterns: [/log\s*in/i, /sign\s*up/i, /create.*account/i, /password/i, /sign\s*in/i],
      answer: 'Use the landing page Login or Get Started buttons. If signup fails, recheck your username and matching passwords, then submit again.'
    },
    {
      id: 'navigation',
      minScore: 3,
      keywords: ['where', 'find', 'go', 'open', 'page', 'navigate', 'location', 'button'],
      patterns: [/where\s+is/i, /how\s+do\s+i\s+get\s+to/i, /where\s+do\s+i\s+go/i],
      answer: 'Main flow: open Profile page, add/select a baby card, then click View Monitor. Use the top-right account box for Edit Account and use landing page links for Login or Sign Up.'
    },
    {
      id: 'troubleshoot',
      minScore: 2,
      keywords: ['error', 'issue', 'problem', 'broken', 'stuck', 'not', 'working', 'fix', 'troubleshoot', 'refresh'],
      patterns: [/not\s+working/i, /error/i, /broken/i, /stuck/i, /troubleshoot/i, /fix/i],
      answer: 'Try this order: refresh the page, retry the action, and confirm you are on the expected page. If it still fails, tell me the exact page and button name and I will walk you through targeted steps.'
    },
    {
      id: 'medical-advice',
      minScore: 2,
      keywords: ['medical', 'doctor', 'diagnose', 'diagnosis', 'medicine', 'treatment', 'urgent', 'emergency', 'safe'],
      patterns: [/medical\s+advice/i, /should\s+i\s+worry/i, /is\s+my\s+baby\s+ok/i, /emergency/i],
      answer: 'I cannot provide medical advice or diagnosis. If you are worried about your baby\'s health, contact a qualified healthcare professional or local emergency services right away.'
    }
  ];

  const appendMessage = (role, text) => {
    const bubble = document.createElement('div');
    bubble.className = `lully-chatbot-message ${role}`;
    bubble.textContent = text;
    elements.messages.appendChild(bubble);
    elements.messages.scrollTop = elements.messages.scrollHeight;
  };

  const normalizeText = (value) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const tokenize = (value) => {
    const baseTokens = normalizeText(value).split(' ').filter((token) => token.length > 1);
    return baseTokens.map((token) => tokenAliases[token] || token);
  };

  const scoreRule = (rule, normalized, tokens) => {
    if (rule.patterns.some((regex) => regex.test(normalized))) {
      return 100;
    }

    const tokenSet = new Set(tokens);
    let score = 0;

    rule.keywords.forEach((keyword) => {
      if (tokenSet.has(keyword)) {
        score += 2;
        return;
      }

      const partialMatch = tokens.some((token) => token.startsWith(keyword) || keyword.startsWith(token));
      if (partialMatch) {
        score += 1;
      }
    });

    return score;
  };

  const findBestIntent = (normalized, tokens) => {
    let bestRule = null;
    let bestScore = -1;

    intentRules.forEach((rule) => {
      const score = scoreRule(rule, normalized, tokens);
      if (score > bestScore) {
        bestScore = score;
        bestRule = rule;
      }
    });

    if (bestRule && bestScore >= bestRule.minScore) {
      return bestRule;
    }

    return null;
  };

  const isLikelySiteQuestion = (tokens) => {
    return tokens.some((token) => {
      return siteTerms.some((term) => token.startsWith(term) || term.startsWith(token));
    });
  };

  const buildReply = (userText) => {
    const cleaned = userText.trim();
    if (!cleaned) {
      return botText.empty;
    }

    const normalized = normalizeText(cleaned);
    const tokens = tokenize(cleaned);

    if (blockedPatterns.some((regex) => regex.test(normalized))) {
      return botText.unsafe;
    }

    const matchedIntent = findBestIntent(normalized, tokens);
    if (matchedIntent) {
      return matchedIntent.answer;
    }

    if (isLikelySiteQuestion(tokens)) {
      return botText.fallbackSite;
    }

    return botText.fallbackGeneral;
  };

  const sendMessage = (value) => {
    const userText = value.trim();
    if (!userText) {
      return;
    }

    appendMessage('user', userText);
    window.setTimeout(() => {
      appendMessage('assistant', buildReply(userText));
    }, 320);
  };

  const openChatbot = () => {
    chatbot.classList.add('is-open');
    elements.toggleButton.setAttribute('aria-expanded', 'true');
    elements.panel.setAttribute('aria-hidden', 'false');
    elements.overlay.hidden = false;
    window.setTimeout(() => {
      elements.input.focus();
    }, 120);
  };

  const closeChatbot = () => {
    chatbot.classList.remove('is-open');
    elements.toggleButton.setAttribute('aria-expanded', 'false');
    elements.panel.setAttribute('aria-hidden', 'true');
    elements.overlay.hidden = true;
  };

  elements.toggleButton.addEventListener('click', () => {
    if (chatbot.classList.contains('is-open')) {
      closeChatbot();
      return;
    }

    openChatbot();
  });

  elements.closeButton.addEventListener('click', closeChatbot);
  elements.overlay.addEventListener('click', closeChatbot);

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    sendMessage(elements.input.value);
    elements.input.value = '';
  });

  appendMessage('assistant', botText.greeting);
});