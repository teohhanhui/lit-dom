import test from 'ava';

// Comprehensive isolation scenarios for real-world Cycle.js applications

class IsolationScenarios {
  constructor() {
    this.isolateModule = new Map(); // element -> namespace
    this.namespaceElements = new Map(); // namespace key -> Set of elements
  }
  
  insertElement(namespace, element) {
    const key = JSON.stringify(namespace);
    this.isolateModule.set(element, namespace);
    
    if (!this.namespaceElements.has(key)) {
      this.namespaceElements.set(key, new Set());
    }
    this.namespaceElements.get(key).add(element);
  }
  
  getElement(namespace) {
    const key = JSON.stringify(namespace);
    const elements = this.namespaceElements.get(key);
    return elements ? elements.values().next().value : undefined;
  }
  
  getNamespace(element) {
    return this.isolateModule.get(element);
  }
  
  removeElement(element) {
    const namespace = this.getNamespace(element);
    if (namespace) {
      const key = JSON.stringify(namespace);
      const elements = this.namespaceElements.get(key);
      if (elements) {
        elements.delete(element);
        if (elements.size === 0) {
          this.namespaceElements.delete(key);
        }
      }
    }
    this.isolateModule.delete(element);
  }
  
  hasElementInNamespace(namespace, element) {
    const key = JSON.stringify(namespace);
    const elements = this.namespaceElements.get(key);
    return elements ? elements.has(element) : false;
  }
}

test('Scenario: E-commerce product listing with conflicting "active" classes', t => {
  const isolation = new IsolationScenarios();
  
  // Simulate e-commerce site with multiple "active" states
  const productGrid = document.createElement('div');
  productGrid.className = 'product-grid';
  
  // Product cards - each has "active" state when hovered
  const product1 = document.createElement('div');
  product1.className = 'product-card active'; // User is hovering
  product1.innerHTML = `
    <div class="product-image">
      <button class="favorite-btn active">♥</button>
    </div>
    <div class="product-info">
      <button class="add-to-cart">Add to Cart</button>
    </div>
  `;
  
  const product2 = document.createElement('div');
  product2.className = 'product-card';
  product2.innerHTML = `
    <div class="product-image">
      <button class="favorite-btn">♡</button>
    </div>
    <div class="product-info">
      <button class="add-to-cart active">Add to Cart</button>
    </div>
  `;
  
  // Sidebar filters - also has "active" states
  const sidebar = document.createElement('div');
  sidebar.className = 'filters-sidebar';
  sidebar.innerHTML = `
    <div class="filter-group">
      <button class="filter-option active">Under $50</button>
      <button class="filter-option">$50-$100</button>
    </div>
  `;
  
  productGrid.appendChild(product1);
  productGrid.appendChild(product2);
  
  // Create isolated scopes to prevent "active" class conflicts
  const gridScope = [{type: 'sibling', scope: '.product-grid'}];
  const product1Scope = [...gridScope, {type: 'sibling', scope: '.product-1'}];
  const product2Scope = [...gridScope, {type: 'sibling', scope: '.product-2'}];
  const sidebarScope = [{type: 'sibling', scope: '.sidebar'}];
  
  isolation.insertElement(gridScope, productGrid);
  isolation.insertElement(product1Scope, product1);
  isolation.insertElement(product2Scope, product2);
  isolation.insertElement(sidebarScope, sidebar);
  
  // Register interactive elements with their parent scopes
  const favoriteBtn1 = product1.querySelector('.favorite-btn');
  const addToCartBtn1 = product1.querySelector('.add-to-cart');
  const favoriteBtn2 = product2.querySelector('.favorite-btn');
  const addToCartBtn2 = product2.querySelector('.add-to-cart');
  const filterBtn = sidebar.querySelector('.filter-option.active');
  
  isolation.insertElement(product1Scope, favoriteBtn1);
  isolation.insertElement(product1Scope, addToCartBtn1);
  isolation.insertElement(product2Scope, favoriteBtn2);
  isolation.insertElement(product2Scope, addToCartBtn2);
  isolation.insertElement(sidebarScope, filterBtn);
  
  // Verify isolation prevents conflicts
  t.true(isolation.hasElementInNamespace(product1Scope, product1));
  t.true(isolation.hasElementInNamespace(product2Scope, product2));
  t.true(isolation.hasElementInNamespace(sidebarScope, sidebar));
  
  // Verify that elements with same "active" class are properly isolated
  t.deepEqual(isolation.getNamespace(favoriteBtn1), product1Scope);
  t.deepEqual(isolation.getNamespace(addToCartBtn2), product2Scope);
  t.deepEqual(isolation.getNamespace(filterBtn), sidebarScope);
  
  // All should have different namespaces despite some having 'active' class
  t.notDeepEqual(isolation.getNamespace(favoriteBtn1), isolation.getNamespace(filterBtn));
  t.notDeepEqual(isolation.getNamespace(addToCartBtn2), isolation.getNamespace(filterBtn));
});

test('Scenario: Dynamic chat application with message bubbles', t => {
  const isolation = new IsolationScenarios();
  
  // Simulate chat app where messages are dynamically added/removed
  const chatContainer = document.createElement('div');
  chatContainer.className = 'chat-container';
  
  const messagesList = document.createElement('div');
  messagesList.className = 'messages-list';
  chatContainer.appendChild(messagesList);
  
  const containerScope = [{type: 'sibling', scope: '.chat'}];
  const messagesScope = [...containerScope, {type: 'sibling', scope: '.messages'}];
  
  isolation.insertElement(containerScope, chatContainer);
  isolation.insertElement(messagesScope, messagesList);
  
  // Function to create a message with common classes that might conflict
  function createMessage(id, content, isOwn = false) {
    const message = document.createElement('div');
    message.className = `message ${isOwn ? 'own' : 'other'}`;
    message.innerHTML = `
      <div class="message-content">${content}</div>
      <div class="message-actions">
        <button class="action-btn reply">Reply</button>
        <button class="action-btn react">😊</button>
        ${isOwn ? '<button class="action-btn delete">Delete</button>' : ''}
      </div>
      <div class="message-timestamp">Just now</div>
    `;
    
    const messageScope = [...messagesScope, {type: 'sibling', scope: `.msg-${id}`}];
    isolation.insertElement(messageScope, message);
    
    // Register interactive elements
    const replyBtn = message.querySelector('.reply');
    const reactBtn = message.querySelector('.react');
    const deleteBtn = message.querySelector('.delete');
    
    isolation.insertElement(messageScope, replyBtn);
    isolation.insertElement(messageScope, reactBtn);
    if (deleteBtn) isolation.insertElement(messageScope, deleteBtn);
    
    return {message, messageScope};
  }
  
  // Create multiple messages with potentially conflicting classes
  const messages = [
    createMessage('1', 'Hello everyone!', false),
    createMessage('2', 'Hi there! How are you?', true),
    createMessage('3', 'Great! Working on some tests', true),
    createMessage('4', 'That sounds interesting', false)
  ];
  
  messages.forEach(({message}) => {
    messagesList.appendChild(message);
  });
  
  // Verify each message is properly isolated
  messages.forEach(({message, messageScope}) => {
    t.true(isolation.hasElementInNamespace(messageScope, message));
    
    const replyBtn = message.querySelector('.reply');
    const reactBtn = message.querySelector('.react');
    
    t.deepEqual(isolation.getNamespace(replyBtn), messageScope);
    t.deepEqual(isolation.getNamespace(reactBtn), messageScope);
  });
  
  // Simulate deleting a message (dynamic removal)
  const messageToDelete = messages[1]; // "Hi there! How are you?"
  messagesList.removeChild(messageToDelete.message);
  isolation.removeElement(messageToDelete.message);
  
  // Verify message is removed from isolation
  t.false(isolation.hasElementInNamespace(messageToDelete.messageScope, messageToDelete.message));
  t.is(isolation.getNamespace(messageToDelete.message), undefined);
  
  // Other messages should remain isolated
  const remainingMessages = [messages[0], messages[2], messages[3]];
  remainingMessages.forEach(({message, messageScope}) => {
    t.true(isolation.hasElementInNamespace(messageScope, message));
  });
});

test('Scenario: Complex dashboard with nested widgets and conflicting button classes', t => {
  const isolation = new IsolationScenarios();
  
  // Simulate dashboard with multiple widgets that have similar controls
  const dashboard = document.createElement('div');
  dashboard.className = 'dashboard';
  
  // Widget 1: Analytics Chart
  const analyticsWidget = document.createElement('div');
  analyticsWidget.className = 'widget analytics-widget';
  analyticsWidget.innerHTML = `
    <div class="widget-header">
      <h3>Analytics</h3>
      <div class="widget-controls">
        <button class="btn primary refresh">Refresh</button>
        <button class="btn secondary settings">Settings</button>
      </div>
    </div>
    <div class="widget-content">
      <div class="chart-container">
        <button class="btn primary export">Export</button>
      </div>
    </div>
  `;
  
  // Widget 2: User Management (same button classes as analytics)
  const userWidget = document.createElement('div');
  userWidget.className = 'widget user-widget';
  userWidget.innerHTML = `
    <div class="widget-header">
      <h3>Users</h3>
      <div class="widget-controls">
        <button class="btn primary add-user">Add User</button>
        <button class="btn secondary settings">Settings</button>
      </div>
    </div>
    <div class="widget-content">
      <div class="user-list">
        <button class="btn primary refresh">Refresh List</button>
      </div>
    </div>
  `;
  
  // Widget 3: Notifications (nested components)
  const notificationWidget = document.createElement('div');
  notificationWidget.className = 'widget notification-widget';
  notificationWidget.innerHTML = `
    <div class="widget-header">
      <h3>Notifications</h3>
      <div class="widget-controls">
        <button class="btn primary mark-all-read">Mark All Read</button>
        <button class="btn secondary settings">Settings</button>
      </div>
    </div>
    <div class="widget-content">
      <div class="notification-item">
        <button class="btn primary action">View</button>
        <button class="btn secondary dismiss">Dismiss</button>
      </div>
      <div class="notification-item">
        <button class="btn primary action">View</button>
        <button class="btn secondary dismiss">Dismiss</button>
      </div>
    </div>
  `;
  
  dashboard.appendChild(analyticsWidget);
  dashboard.appendChild(userWidget);
  dashboard.appendChild(notificationWidget);
  
  // Create isolated scopes for each widget
  const dashboardScope = [{type: 'total', scope: 'dashboard'}];
  const analyticsScope = [...dashboardScope, {type: 'sibling', scope: '.analytics'}];
  const userScope = [...dashboardScope, {type: 'sibling', scope: '.users'}];
  const notificationScope = [...dashboardScope, {type: 'sibling', scope: '.notifications'}];
  
  isolation.insertElement(dashboardScope, dashboard);
  isolation.insertElement(analyticsScope, analyticsWidget);
  isolation.insertElement(userScope, userWidget);
  isolation.insertElement(notificationScope, notificationWidget);
  
  // Register all buttons with their widget scopes
  const analyticsButtons = analyticsWidget.querySelectorAll('button');
  const userButtons = userWidget.querySelectorAll('button');
  const notificationButtons = notificationWidget.querySelectorAll('button');
  
  analyticsButtons.forEach(btn => isolation.insertElement(analyticsScope, btn));
  userButtons.forEach(btn => isolation.insertElement(userScope, btn));
  notificationButtons.forEach(btn => isolation.insertElement(notificationScope, btn));
  
  // Additional isolation for individual notification items
  const notificationItems = notificationWidget.querySelectorAll('.notification-item');
  notificationItems.forEach((item, index) => {
    const itemScope = [...notificationScope, {type: 'sibling', scope: `.notification-${index}`}];
    isolation.insertElement(itemScope, item);
    
    const itemButtons = item.querySelectorAll('button');
    itemButtons.forEach(btn => isolation.insertElement(itemScope, btn));
  });
  
  // Verify widget isolation
  t.true(isolation.hasElementInNamespace(analyticsScope, analyticsWidget));
  t.true(isolation.hasElementInNamespace(userScope, userWidget));
  t.true(isolation.hasElementInNamespace(notificationScope, notificationWidget));
  
  // Verify that buttons with same classes are properly isolated
  const analyticsRefresh = analyticsWidget.querySelector('.refresh');
  const userRefresh = userWidget.querySelector('.refresh');
  const analyticsSettings = analyticsWidget.querySelector('.settings');
  const userSettings = userWidget.querySelector('.settings');
  
  t.deepEqual(isolation.getNamespace(analyticsRefresh), analyticsScope);
  t.deepEqual(isolation.getNamespace(userRefresh), userScope);
  t.notDeepEqual(isolation.getNamespace(analyticsRefresh), isolation.getNamespace(userRefresh));
  t.notDeepEqual(isolation.getNamespace(analyticsSettings), isolation.getNamespace(userSettings));
  
  // Verify nested notification items are isolated
  const notificationViewButtons = notificationWidget.querySelectorAll('.action');
  const firstNotificationScope = [...notificationScope, {type: 'sibling', scope: '.notification-0'}];
  const secondNotificationScope = [...notificationScope, {type: 'sibling', scope: '.notification-1'}];
  
  t.deepEqual(isolation.getNamespace(notificationViewButtons[0]), firstNotificationScope);
  t.deepEqual(isolation.getNamespace(notificationViewButtons[1]), secondNotificationScope);
  t.notDeepEqual(isolation.getNamespace(notificationViewButtons[0]), isolation.getNamespace(notificationViewButtons[1]));
});

test('Scenario: Modal dialogs with conflicting z-index and overlay classes', t => {
  const isolation = new IsolationScenarios();
  
  // Simulate multiple modals that can be stacked
  const app = document.createElement('div');
  app.className = 'app';
  
  // Main modal (confirmation dialog)
  const confirmModal = document.createElement('div');
  confirmModal.className = 'modal active overlay';
  confirmModal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <h2>Confirm Action</h2>
      <p>Are you sure you want to proceed?</p>
      <div class="modal-actions">
        <button class="btn primary confirm">Confirm</button>
        <button class="btn secondary cancel">Cancel</button>
      </div>
    </div>
  `;
  
  // Nested modal (help dialog opened from main modal)
  const helpModal = document.createElement('div');
  helpModal.className = 'modal active overlay help-modal';
  helpModal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content">
      <h2>Help</h2>
      <p>This action will permanently delete the item.</p>
      <div class="modal-actions">
        <button class="btn primary ok">Got it</button>
      </div>
    </div>
  `;
  
  // Toast notification (also uses overlay classes)
  const toast = document.createElement('div');
  toast.className = 'toast active overlay';
  toast.innerHTML = `
    <div class="toast-content">
      <span>Operation completed successfully</span>
      <button class="btn secondary close">×</button>
    </div>
  `;
  
  app.appendChild(confirmModal);
  app.appendChild(helpModal);
  app.appendChild(toast);
  
  // Create isolated scopes for layered UI elements
  const appScope = [{type: 'total', scope: 'app'}];
  const confirmModalScope = [...appScope, {type: 'sibling', scope: '.confirm-modal'}];
  const helpModalScope = [...appScope, {type: 'sibling', scope: '.help-modal'}];
  const toastScope = [...appScope, {type: 'sibling', scope: '.toast-notification'}];
  
  isolation.insertElement(appScope, app);
  isolation.insertElement(confirmModalScope, confirmModal);
  isolation.insertElement(helpModalScope, helpModal);
  isolation.insertElement(toastScope, toast);
  
  // Register interactive elements
  const confirmBtn = confirmModal.querySelector('.confirm');
  const cancelBtn = confirmModal.querySelector('.cancel');
  const okBtn = helpModal.querySelector('.ok');
  const closeBtn = toast.querySelector('.close');
  
  isolation.insertElement(confirmModalScope, confirmBtn);
  isolation.insertElement(confirmModalScope, cancelBtn);
  isolation.insertElement(helpModalScope, okBtn);
  isolation.insertElement(toastScope, closeBtn);
  
  // Verify each overlay component is properly isolated
  t.true(isolation.hasElementInNamespace(confirmModalScope, confirmModal));
  t.true(isolation.hasElementInNamespace(helpModalScope, helpModal));
  t.true(isolation.hasElementInNamespace(toastScope, toast));
  
  // Verify buttons with same classes are isolated
  t.deepEqual(isolation.getNamespace(confirmBtn), confirmModalScope);
  t.deepEqual(isolation.getNamespace(okBtn), helpModalScope);
  t.deepEqual(isolation.getNamespace(closeBtn), toastScope);
  
  // All elements have 'active' and 'overlay' classes but different scopes
  t.notDeepEqual(isolation.getNamespace(confirmModal), isolation.getNamespace(helpModal));
  t.notDeepEqual(isolation.getNamespace(helpModal), isolation.getNamespace(toast));
  t.notDeepEqual(isolation.getNamespace(confirmModal), isolation.getNamespace(toast));
  
  // Simulate closing help modal (dynamic removal)
  isolation.removeElement(helpModal);
  t.false(isolation.hasElementInNamespace(helpModalScope, helpModal));
  
  // Other modals should remain isolated
  t.true(isolation.hasElementInNamespace(confirmModalScope, confirmModal));
  t.true(isolation.hasElementInNamespace(toastScope, toast));
});

test('Scenario: Real-time collaboration editor with multiple cursors and selections', t => {
  const isolation = new IsolationScenarios();
  
  // Simulate collaborative editor like Google Docs
  const editor = document.createElement('div');
  editor.className = 'editor';
  
  const editorContent = document.createElement('div');
  editorContent.className = 'editor-content';
  editorContent.innerHTML = `
    <p>This is a collaborative document where multiple users can edit simultaneously.</p>
    <p>Each user has their own cursor and selection highlighting.</p>
  `;
  
  editor.appendChild(editorContent);
  
  // User cursors (each user gets isolated cursor/selection)
  const user1Cursor = document.createElement('div');
  user1Cursor.className = 'cursor active user-cursor';
  user1Cursor.style.cssText = 'position: absolute; background: blue;';
  
  const user2Cursor = document.createElement('div');
  user2Cursor.className = 'cursor active user-cursor';
  user2Cursor.style.cssText = 'position: absolute; background: red;';
  
  const user3Cursor = document.createElement('div');
  user3Cursor.className = 'cursor active user-cursor';
  user3Cursor.style.cssText = 'position: absolute; background: green;';
  
  // Selection highlights for each user
  const user1Selection = document.createElement('div');
  user1Selection.className = 'selection active highlight';
  user1Selection.style.cssText = 'background: rgba(0,0,255,0.2);';
  
  const user2Selection = document.createElement('div');
  user2Selection.className = 'selection active highlight';
  user2Selection.style.cssText = 'background: rgba(255,0,0,0.2);';
  
  editorContent.appendChild(user1Cursor);
  editorContent.appendChild(user2Cursor);
  editorContent.appendChild(user3Cursor);
  editorContent.appendChild(user1Selection);
  editorContent.appendChild(user2Selection);
  
  // Create isolated scopes for each user's UI elements
  const editorScope = [{type: 'total', scope: 'editor'}];
  const user1Scope = [...editorScope, {type: 'sibling', scope: '.user-alice'}];
  const user2Scope = [...editorScope, {type: 'sibling', scope: '.user-bob'}];
  const user3Scope = [...editorScope, {type: 'sibling', scope: '.user-charlie'}];
  
  isolation.insertElement(editorScope, editor);
  isolation.insertElement(user1Scope, user1Cursor);
  isolation.insertElement(user1Scope, user1Selection);
  isolation.insertElement(user2Scope, user2Cursor);
  isolation.insertElement(user2Scope, user2Selection);
  isolation.insertElement(user3Scope, user3Cursor);
  
  // Verify each user's elements are properly isolated
  t.true(isolation.hasElementInNamespace(user1Scope, user1Cursor));
  t.deepEqual(isolation.getNamespace(user1Cursor), user1Scope);
  t.deepEqual(isolation.getNamespace(user1Selection), user1Scope);
  t.deepEqual(isolation.getNamespace(user2Cursor), user2Scope);
  t.deepEqual(isolation.getNamespace(user2Selection), user2Scope);
  t.deepEqual(isolation.getNamespace(user3Cursor), user3Scope);
  
  // All cursors have same classes but different scopes
  t.notDeepEqual(isolation.getNamespace(user1Cursor), isolation.getNamespace(user2Cursor));
  t.notDeepEqual(isolation.getNamespace(user2Cursor), isolation.getNamespace(user3Cursor));
  t.notDeepEqual(isolation.getNamespace(user1Selection), isolation.getNamespace(user2Selection));
  
  // Simulate user leaving (dynamic removal)
  isolation.removeElement(user2Cursor);
  isolation.removeElement(user2Selection);
  
  t.is(isolation.getNamespace(user2Cursor), undefined);
  t.is(isolation.getNamespace(user2Selection), undefined);
  
  // Other users' elements should remain isolated
  t.deepEqual(isolation.getNamespace(user1Cursor), user1Scope);
  t.deepEqual(isolation.getNamespace(user3Cursor), user3Scope);
  
  t.pass('Real-time collaboration isolation scenario completed successfully');
});