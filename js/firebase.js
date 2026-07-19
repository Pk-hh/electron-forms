const useLiveFirebase = true; 

const firebaseConfig = {
  apiKey: "AIzaSyAlsVI16li1Qnmgu9QW702dE8V0J31zmv0",
  authDomain: "bloodconnect-74589.firebaseapp.com",
  databaseURL: "https://bloodconnect-74589-default-rtdb.firebaseio.com",
  projectId: "bloodconnect-74589",
  storageBucket: "bloodconnect-74589.firebasestorage.app",
  messagingSenderId: "30460514332",
  appId: "1:30460514332:web:b93e62e0fd98a6fb16cfd9",
  measurementId: "G-VKRCM390MG"
};

// ==========================================
// 2. Local Storage Adapter Definition
// ==========================================
class LocalStorageAdapter {
  constructor() {
    this.initMockData();
  }

  initMockData() {
    // Check if defaults are already loaded
    if (!localStorage.getItem('es_initialized')) {
      const defaultUser = {
        uid: 'user_demo',
        email: 'demo@electronstudios.com',
        displayName: 'Creative Creator',
        photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
        createdAt: new Date().toISOString()
      };

      const defaultTemplates = [
        {
          id: 'template_satisfaction',
          title: 'Customer Satisfaction Survey',
          description: 'Gather feedback about your products and customer support quality.',
          isTemplate: true,
          theme: {
            color: '#6366f1',
            banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
            font: 'var(--font-sans)'
          },
          questions: [
            { id: 'q1', type: 'rating', title: 'How satisfied are you with our product?', required: true, helpText: 'Rate from 1 to 5 stars.' },
            { id: 'q2', type: 'multiple-choice', title: 'How often do you use our product?', required: true, options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
            { id: 'q3', type: 'paragraph', title: 'What is the single most important improvement we could make?', required: false }
          ]
        },
        {
          id: 'template_event',
          title: 'Event Registration Form',
          description: 'RSVP collection form for conferences, workshops, or webinars.',
          isTemplate: true,
          theme: {
            color: '#10b981',
            banner: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80',
            font: 'var(--font-sans)'
          },
          questions: [
            { id: 'qe1', type: 'short-answer', title: 'Full Name', required: true },
            { id: 'qe2', type: 'email', title: 'Email Address', required: true },
            { id: 'qe3', type: 'multiple-choice', title: 'Dietary Preferences', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free'] },
            { id: 'qe4', type: 'yes-no', title: 'Will you attend the networking dinner?', required: true }
          ]
        },
        {
          id: 'template_job',
          title: 'Job Application Form',
          description: 'Streamlined intake form for recruiting teams and candidate hiring.',
          isTemplate: true,
          theme: {
            color: '#f59e0b',
            banner: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1200&q=80',
            font: 'var(--font-sans)'
          },
          questions: [
            { id: 'qj1', type: 'short-answer', title: 'Position Applied For', required: true },
            { id: 'qj2', type: 'phone', title: 'Phone Number', required: true },
            { id: 'qj3', type: 'url', title: 'Portfolio / LinkedIn Profile', required: false },
            { id: 'qj4', type: 'file', title: 'Upload Resume / CV', required: true, helpText: 'PDF format preferred.' }
          ]
        }
      ];

      // Add a couple of initial user forms to make the dashboard look active
      const defaultForms = [
        {
          id: 'form_prod_feedback',
          userId: 'user_demo',
          title: 'Product Launch Feedback',
          description: 'Feedback regarding the v2.0 release candidate.',
          status: 'published', // draft, published, archived
          folderId: null,
          favorite: true,
          views: 142,
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          theme: { color: '#6366f1', banner: '', font: 'var(--font-sans)' },
          questions: [
            { id: 'qp1', type: 'rating', title: 'Rate the new UX navigation', required: true },
            { id: 'qp2', type: 'checkbox', title: 'Which new features do you use most?', required: false, options: ['Visual Builder', 'Analytics View', 'Excel Export', 'QR Share'] }
          ]
        },
        {
          id: 'form_newsletter',
          userId: 'user_demo',
          title: 'Newsletter Subscription Sign-ups',
          description: 'Quick sign-up form for weekly product insights.',
          status: 'draft',
          folderId: null,
          favorite: false,
          views: 12,
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
          theme: { color: '#ec4899', banner: '', font: 'var(--font-sans)' },
          questions: [
            { id: 'qn1', type: 'email', title: 'Enter your business email', required: true }
          ]
        }
      ];

      const defaultResponses = [
        {
          id: 'resp_1',
          formId: 'form_prod_feedback',
          submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          email: 'jane@example.com',
          answers: { qp1: 5, qp2: ['Visual Builder', 'QR Share'] }
        },
        {
          id: 'resp_2',
          formId: 'form_prod_feedback',
          submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          email: 'bob@example.com',
          answers: { qp1: 4, qp2: ['Analytics View', 'Excel Export'] }
        },
        {
          id: 'resp_3',
          formId: 'form_prod_feedback',
          submittedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          email: 'mark@example.com',
          answers: { qp1: 3, qp2: ['Visual Builder', 'Analytics View'] }
        }
      ];

      const defaultFolders = [
        { id: 'folder_q3', name: 'Q3 Product Surveys', userId: 'user_demo', createdAt: new Date().toISOString() },
        { id: 'folder_hr', name: 'HR Recruiting', userId: 'user_demo', createdAt: new Date().toISOString() }
      ];

      localStorage.setItem('es_users', JSON.stringify([defaultUser]));
      localStorage.setItem('es_templates', JSON.stringify(defaultTemplates));
      localStorage.setItem('es_forms', JSON.stringify(defaultForms));
      localStorage.setItem('es_responses', JSON.stringify(defaultResponses));
      localStorage.setItem('es_folders', JSON.stringify(defaultFolders));
      localStorage.setItem('es_current_user', JSON.stringify(defaultUser));
      localStorage.setItem('es_initialized', 'true');
    }
  }

  // --- Auth APIs ---
  async getCurrentUser() {
    return JSON.parse(localStorage.getItem('es_current_user'));
  }

  async loginWithEmail(email, password) {
    const users = JSON.parse(localStorage.getItem('es_users')) || [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      localStorage.setItem('es_current_user', JSON.stringify(user));
      return user;
    }
    throw new Error('User not found. Try demo@electronstudios.com or create a new account.');
  }

  async registerWithEmail(email, password, name) {
    const users = JSON.parse(localStorage.getItem('es_users')) || [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User with this email already exists.');
    }
    const newUser = {
      uid: 'u_' + Math.random().toString(36).substr(2, 9),
      email: email,
      displayName: name || email.split('@')[0],
      photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    localStorage.setItem('es_users', JSON.stringify(users));
    localStorage.setItem('es_current_user', JSON.stringify(newUser));
    return newUser;
  }

  async logout() {
    localStorage.removeItem('es_current_user');
    return true;
  }

  async updateProfile(displayName, photoURL) {
    const user = await this.getCurrentUser();
    if (!user) throw new Error("Not logged in");
    user.displayName = displayName || user.displayName;
    user.photoURL = photoURL || user.photoURL;

    // Update current user
    localStorage.setItem('es_current_user', JSON.stringify(user));

    // Update in users table
    const users = JSON.parse(localStorage.getItem('es_users')) || [];
    const idx = users.findIndex(u => u.uid === user.uid);
    if (idx !== -1) {
      users[idx] = user;
      localStorage.setItem('es_users', JSON.stringify(users));
    }
    return user;
  }

  // --- Form Builder APIs ---
  async getForms(userId) {
    const forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    return forms.filter(f => f.userId === userId);
  }

  async getTemplates() {
    return JSON.parse(localStorage.getItem('es_templates')) || [];
  }

  async getForm(formId) {
    const forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    const form = forms.find(f => f.id === formId);
    if (form) return form;
    // Check templates if not found in forms
    const templates = await this.getTemplates();
    return templates.find(t => t.id === formId);
  }

  async saveForm(form) {
    const forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    const index = forms.findIndex(f => f.id === form.id);
    
    // Ensure audit properties
    form.updatedAt = new Date().toISOString();
    if (index === -1) {
      form.createdAt = form.createdAt || new Date().toISOString();
      form.views = form.views || 0;
      forms.push(form);
    } else {
      forms[index] = { ...forms[index], ...form };
    }
    
    localStorage.setItem('es_forms', JSON.stringify(forms));
    return form;
  }

  async deleteForm(formId) {
    let forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    forms = forms.filter(f => f.id !== formId);
    localStorage.setItem('es_forms', JSON.stringify(forms));
    
    // Delete responses associated
    let responses = JSON.parse(localStorage.getItem('es_responses')) || [];
    responses = responses.filter(r => r.formId !== formId);
    localStorage.setItem('es_responses', JSON.stringify(responses));
    
    return true;
  }

  async duplicateForm(formId, newTitle) {
    const srcForm = await this.getForm(formId);
    if (!srcForm) throw new Error("Source form not found");
    const duplicated = {
      ...srcForm,
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      title: newTitle || `${srcForm.title} (Copy)`,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.saveForm(duplicated);
    return duplicated;
  }

  async incrementFormViews(formId) {
    const forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    const index = forms.findIndex(f => f.id === formId);
    if (index !== -1) {
      forms[index].views = (forms[index].views || 0) + 1;
      localStorage.setItem('es_forms', JSON.stringify(forms));
    }
  }

  // --- Folder Management APIs ---
  async getFolders(userId) {
    const folders = JSON.parse(localStorage.getItem('es_folders')) || [];
    return folders.filter(f => f.userId === userId);
  }

  async createFolder(name, userId) {
    const folders = JSON.parse(localStorage.getItem('es_folders')) || [];
    const folder = {
      id: 'folder_' + Math.random().toString(36).substr(2, 9),
      name,
      userId,
      createdAt: new Date().toISOString()
    };
    folders.push(folder);
    localStorage.setItem('es_folders', JSON.stringify(folders));
    return folder;
  }

  async deleteFolder(folderId) {
    let folders = JSON.parse(localStorage.getItem('es_folders')) || [];
    folders = folders.filter(f => f.id !== folderId);
    localStorage.setItem('es_folders', JSON.stringify(folders));
    
    // Un-assign forms in folder
    const forms = JSON.parse(localStorage.getItem('es_forms')) || [];
    forms.forEach(f => {
      if (f.folderId === folderId) f.folderId = null;
    });
    localStorage.setItem('es_forms', JSON.stringify(forms));
    return true;
  }

  // --- Response APIs ---
  async saveResponse(response) {
    const responses = JSON.parse(localStorage.getItem('es_responses')) || [];
    response.id = response.id || 'resp_' + Math.random().toString(36).substr(2, 9);
    response.submittedAt = response.submittedAt || new Date().toISOString();
    responses.push(response);
    localStorage.setItem('es_responses', JSON.stringify(responses));
    return response;
  }

  async getResponses(formId) {
    const responses = JSON.parse(localStorage.getItem('es_responses')) || [];
    return responses.filter(r => r.formId === formId);
  }

  async deleteResponse(responseId) {
    let responses = JSON.parse(localStorage.getItem('es_responses')) || [];
    responses = responses.filter(r => r.id !== responseId);
    localStorage.setItem('es_responses', JSON.stringify(responses));
    return true;
  }
}

// ==========================================
// 3. Live Firebase Storage Adapter
// ==========================================
class LiveFirebaseAdapter {
  constructor() {
    firebase.initializeApp(firebaseConfig);
    this.auth = firebase.auth();
    this.db = firebase.firestore();
  }

  async getCurrentUser() {
    return new Promise((resolve) => {
      this.auth.onAuthStateChanged((user) => {
        if (user) {
          resolve({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email.split('@')[0],
            photoURL: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async loginWithEmail(email, password) {
    const cred = await this.auth.signInWithEmailAndPassword(email, password);
    return {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: cred.user.displayName,
      photoURL: cred.user.photoURL
    };
  }

  async registerWithEmail(email, password, name) {
    const cred = await this.auth.createUserWithEmailAndPassword(email, password);
    if (name) {
      await cred.user.updateProfile({ displayName: name });
    }
    // Set in users collection
    await this.db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid,
      email: email,
      displayName: name || email.split('@')[0],
      createdAt: new Date().toISOString()
    });
    return {
      uid: cred.user.uid,
      email: email,
      displayName: name
    };
  }

  async logout() {
    await this.auth.signOut();
    return true;
  }

  async updateProfile(displayName, photoURL) {
    const user = this.auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const updateObj = {};
    if (displayName) updateObj.displayName = displayName;
    if (photoURL) updateObj.photoURL = photoURL;

    await user.updateProfile(updateObj);
    await this.db.collection('users').doc(user.uid).set(updateObj, { merge: true });

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL
    };
  }

  // --- Form Builder APIs ---
  async getForms(userId) {
    const snapshot = await this.db.collection('forms').where('userId', '==', userId).get();
    const forms = [];
    snapshot.forEach(doc => {
      forms.push({ id: doc.id, ...doc.data() });
    });
    return forms;
  }

  async getTemplates() {
    // Return seed templates to keep visual layouts rich
    return [
      {
        id: 'template_satisfaction',
        title: 'Customer Satisfaction Survey',
        description: 'Gather feedback about your products and customer support quality.',
        theme: { color: '#6366f1', banner: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', font: 'var(--font-sans)' },
        questions: [
          { id: 'q1', type: 'rating', title: 'How satisfied are you with our product?', required: true, helpText: 'Rate from 1 to 5 stars.' },
          { id: 'q2', type: 'multiple-choice', title: 'How often do you use our product?', required: true, options: ['Daily', 'Weekly', 'Monthly', 'Rarely'] },
          { id: 'q3', type: 'paragraph', title: 'What is the single most important improvement we could make?', required: false }
        ]
      },
      {
        id: 'template_event',
        title: 'Event Registration Form',
        description: 'RSVP collection form for conferences, workshops, or webinars.',
        theme: { color: '#10b981', banner: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80', font: 'var(--font-sans)' },
        questions: [
          { id: 'qe1', type: 'short-answer', title: 'Full Name', required: true },
          { id: 'qe2', type: 'email', title: 'Email Address', required: true },
          { id: 'qe3', type: 'multiple-choice', title: 'Dietary Preferences', required: false, options: ['None', 'Vegetarian', 'Vegan', 'Gluten-Free'] },
          { id: 'qe4', type: 'yes-no', title: 'Will you attend the networking dinner?', required: true }
        ]
      }
    ];
  }

  async getForm(formId) {
    const doc = await this.db.collection('forms').doc(formId).get();
    if (doc.exists) {
      return { id: doc.id, ...doc.data() };
    }
    // Fallback templates lookup
    const templates = await this.getTemplates();
    return templates.find(t => t.id === formId);
  }

  async saveForm(form) {
    const formCopy = { ...form };
    const docId = formCopy.id;
    delete formCopy.id;
    
    formCopy.updatedAt = new Date().toISOString();
    await this.db.collection('forms').doc(docId).set(formCopy, { merge: true });
    return form;
  }

  async deleteForm(formId) {
    await this.db.collection('forms').doc(formId).delete();
    
    // Delete associated response payloads
    const snapshot = await this.db.collection('responses').where('formId', '==', formId).get();
    const batch = this.db.batch();
    snapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    return true;
  }

  async duplicateForm(formId, newTitle) {
    const srcForm = await this.getForm(formId);
    if (!srcForm) throw new Error("Source form not found");
    const duplicated = {
      ...srcForm,
      id: 'f_' + Math.random().toString(36).substr(2, 9),
      title: newTitle || `${srcForm.title} (Copy)`,
      views: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await this.saveForm(duplicated);
    return duplicated;
  }

  async incrementFormViews(formId) {
    try {
      await this.db.collection('forms').doc(formId).update({
        views: firebase.firestore.FieldValue.increment(1)
      });
    } catch(err) {
      // If doc is template or fails, ignore
    }
  }

  // --- Folder Management APIs ---
  async getFolders(userId) {
    const snapshot = await this.db.collection('folders').where('userId', '==', userId).get();
    const folders = [];
    snapshot.forEach(doc => {
      folders.push({ id: doc.id, ...doc.data() });
    });
    return folders;
  }

  async createFolder(name, userId) {
    const folderId = 'folder_' + Math.random().toString(36).substr(2, 9);
    const folder = {
      name,
      userId,
      createdAt: new Date().toISOString()
    };
    await this.db.collection('folders').doc(folderId).set(folder);
    return { id: folderId, ...folder };
  }

  async deleteFolder(folderId) {
    await this.db.collection('folders').doc(folderId).delete();
    
    // Reset form folder keys
    const snapshot = await this.db.collection('forms').where('folderId', '==', folderId).get();
    const batch = this.db.batch();
    snapshot.forEach(doc => {
      batch.update(doc.ref, { folderId: null });
    });
    await batch.commit();
    return true;
  }

  // --- Response APIs ---
  async saveResponse(response) {
    const respId = response.id || 'resp_' + Math.random().toString(36).substr(2, 9);
    const respCopy = { ...response };
    delete respCopy.id;
    
    respCopy.submittedAt = new Date().toISOString();
    await this.db.collection('responses').doc(respId).set(respCopy);
    return { id: respId, ...respCopy };
  }

  async getResponses(formId) {
    const snapshot = await this.db.collection('responses').where('formId', '==', formId).get();
    const responses = [];
    snapshot.forEach(doc => {
      responses.push({ id: doc.id, ...doc.data() });
    });
    return responses;
  }

  async deleteResponse(responseId) {
    await this.db.collection('responses').doc(responseId).delete();
    return true;
  }
}

// Instantiate Database and Auth interfaces
let dbAdapter;
if (useLiveFirebase && typeof firebase !== 'undefined') {
  try {
    dbAdapter = new LiveFirebaseAdapter();
    console.log("Firebase initialized in live cloud storage mode.");
  } catch (error) {
    console.error("Failed to initialize Firebase Live Cloud Storage, falling back to LocalStorage mode:", error);
    dbAdapter = new LocalStorageAdapter();
  }
} else {
  dbAdapter = new LocalStorageAdapter();
  console.log("Unified Storage Adapter loaded in LocalStorage Fallback mode.");
}

window.db = dbAdapter;

