const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'study-hours-manager.js');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Guard renderTab
const oldRenderTab = `      renderTab() {
        this.renderPeriodControls();
        const logs = this.getFilteredLogs();
        this.renderSummaryCards(logs);
        this.renderChart(logs);
        this.renderDayTimeline(logs);
        this.renderSubjectsAccordion(logs);
        this.updateSettingsCard();
      },`;

const newRenderTab = `      renderTab(force = false) {
        if (!force && typeof App !== 'undefined' && App.activeTab !== 'tab-study-hours') {
          this._dirty = true;
          return;
        }
        this._dirty = false;
        this.renderPeriodControls();
        const logs = this.getFilteredLogs();
        this.renderSummaryCards(logs);
        this.renderChart(logs);
        this.renderDayTimeline(logs);
        this.renderSubjectsAccordion(logs);
        this.updateSettingsCard();
      },`;

if (content.includes(oldRenderTab)) {
  content = content.replace(oldRenderTab, newRenderTab);
  console.log('study-hours-manager.js: renderTab guarded.');
}

// 2. Optimize toggleTopic
const oldToggleTopicCall = `          App.saveToStorage();
          App.renderSubjects();
          this.renderTab();`;

const newToggleTopicCall = `          App.saveToStorage();
          if (typeof App.updateTopicDom === 'function') {
            App.updateTopicDom(materiaId, topicIndex, false);
          } else {
            App.renderSubjects();
          }
          if (typeof App !== 'undefined' && App.activeTab === 'tab-study-hours') {
            this.renderTab();
          } else {
            this._dirty = true;
          }`;

if (content.includes(oldToggleTopicCall)) {
  content = content.replace(oldToggleTopicCall, newToggleTopicCall);
  console.log('study-hours-manager.js: toggleTopic uncheck optimized.');
}

const oldToggleTopicCheckCall = `            App.saveToStorage();
            App.renderSubjects();
            this.renderTab();
            App.showToast(\`Estudo registrado: \${this.formatMinutes(this.defaultMinutes)}!\`, 'success');`;

const newToggleTopicCheckCall = `            App.saveToStorage();
            if (typeof App.updateTopicDom === 'function') {
              App.updateTopicDom(materiaId, topicIndex, true);
            } else {
              App.renderSubjects();
            }
            if (typeof App !== 'undefined' && App.activeTab === 'tab-study-hours') {
              this.renderTab();
            } else {
              this._dirty = true;
            }
            App.showToast(\`Estudo registrado: \${this.formatMinutes(this.defaultMinutes)}!\`, 'success');`;

if (content.includes(oldToggleTopicCheckCall)) {
  content = content.replace(oldToggleTopicCheckCall, newToggleTopicCheckCall);
  console.log('study-hours-manager.js: toggleTopic check optimized.');
}

if (isCRLF) {
  content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('study-hours-manager.js synchronized successfully.');
