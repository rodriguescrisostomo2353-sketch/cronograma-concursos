    const StudyHoursManager = {
      defaultMinutes: 30,
      autoQuickMark: false,
      period: 'semana', // 'dia' | 'semana' | 'mes' | 'total'
      currentDate: new Date(),
      selectedSubjectId: '',
      showUnstudied: false,
      activeQuickLogMeta: null, // { materiaId, topicIndex, topicId, topicText, isExtra }
      activeEditingLogId: null,
      activeHistoryTopicMeta: null, // { materiaId, topicId, topicText }
      lastUndone: null,
      undoTimer: null,
      expandedSubjectIds: new Set(),

      init() {
        this.loadSettings();
      },

      loadSettings() {
        try {
          const rawDef = localStorage.getItem('concurso_study_default_min');
          if (rawDef) this.defaultMinutes = parseInt(rawDef, 10) || 30;
          const rawAuto = localStorage.getItem('concurso_study_auto_quick_mark');
          this.autoQuickMark = rawAuto === 'true';
        } catch (e) {}
      },

      saveSettings() {
        try {
          localStorage.setItem('concurso_study_default_min', String(this.defaultMinutes));
          localStorage.setItem('concurso_study_auto_quick_mark', String(this.autoQuickMark));
        } catch (e) {}
      },

      setDefaultMinutes(val) {
        this.defaultMinutes = parseInt(val, 10) || 30;
        this.saveSettings();
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(`Tempo padrão atualizado para ${this.formatMinutes(this.defaultMinutes)}.`, 'info');
        }
      },

      setAutoQuickMark(val) {
        this.autoQuickMark = !!val;
        this.saveSettings();
        if (typeof App !== 'undefined' && App.showToast) {
          App.showToast(this.autoQuickMark ? 'Registro rápido ativado: marcará tópicos sem perguntar.' : 'Pergunta rápida ativada ao marcar tópicos.', 'info');
        }
      },

      // Helpers estritamente LOCAIS (evita toISOString() que gera UTC)
      getLocalDateString(d = new Date()) {
        const dateObj = (d instanceof Date) ? d : new Date(d);
        const y = dateObj.getFullYear();
        const m = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      },

      getLocalDateTimeString(d = new Date()) {
        const dateObj = (d instanceof Date) ? d : new Date(d);
        const datePart = this.getLocalDateString(dateObj);
        const h = String(dateObj.getHours()).padStart(2, '0');
        const min = String(dateObj.getMinutes()).padStart(2, '0');
        const s = String(dateObj.getSeconds()).padStart(2, '0');
        return `${datePart} ${h}:${min}:${s}`;
      },

      parseLocalDateString(str) {
        if (!str || typeof str !== 'string') return new Date();
        const parts = str.split('-');
        if (parts.length === 3) {
          return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
        }
        return new Date(str);
      },

      formatDateReadable(d) {
        const dateObj = (d instanceof Date) ? d : new Date(d);
        const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        return `${dateObj.getDate()} de ${meses[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
      },

      formatDateShort(d) {
        const dateObj = (d instanceof Date) ? d : new Date(d);
        const dia = String(dateObj.getDate()).padStart(2, '0');
        const mes = String(dateObj.getMonth() + 1).padStart(2, '0');
        const ano = dateObj.getFullYear();
        return `${dia}/${mes}/${ano}`;
      },

      formatMinutes(mins) {
        const m = Math.round(Number(mins) || 0);
        if (m <= 0) return '0 min';
        const hours = Math.floor(m / 60);
        const remainingMins = m % 60;
        if (hours === 0) return `${remainingMins}min`;
        if (remainingMins === 0) return `${hours}h`;
        return `${hours}h ${remainingMins}min`;
      },

      getWeekRange(dateObj) {
        const d = (dateObj instanceof Date) ? new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 12, 0, 0) : new Date(dateObj);
        const dayOfWeek = d.getDay(); // 0 Dom, 1 Seg, ..., 6 Sáb
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const monday = new Date(d);
        monday.setDate(d.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        return {
          monday,
          sunday,
          startStr: this.getLocalDateString(monday),
          endStr: this.getLocalDateString(sunday)
        };
      },

      getMonthRange(arg1, arg2) {
        let year, monthIndex;
        if (arg1 instanceof Date) {
          year = arg1.getFullYear();
          monthIndex = arg1.getMonth();
        } else if (typeof arg1 === 'number' && typeof arg2 === 'number') {
          year = arg1;
          monthIndex = arg2;
        } else {
          const now = new Date();
          year = now.getFullYear();
          monthIndex = now.getMonth();
        }
        const start = new Date(year, monthIndex, 1, 0, 0, 0, 0);
        const end = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
        return {
          start,
          end,
          startStr: this.getLocalDateString(start),
          endStr: this.getLocalDateString(end)
        };
      },

      getStudyLog() {
        if (!App.studyLog || !Array.isArray(App.studyLog)) {
          App.studyLog = [];
        }
        return App.studyLog;
      },

      addLogEntry(entry) {
        if (!entry) return null;
        const list = this.getStudyLog();
        const newLog = {
          id: entry.id || ('log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)),
          topicoId: entry.topicoId || '',
          topicoNome: entry.topicoNome || '',
          materiaId: entry.materiaId || '',
          materiaNome: entry.materiaNome || '',
          minutos: Math.max(1, Math.round(Number(entry.minutos) || this.defaultMinutes)),
          data: entry.data || this.getLocalDateString(),
          criadoEm: entry.criadoEm || this.getLocalDateTimeString(),
          sessaoId: entry.sessaoId || null,
          origem: entry.origem || 'manual',
          updatedAt: new Date().toISOString()
        };
        list.push(newLog);
        App.saveToStorage();
        return newLog;
      },

      removeLogById(logId) {
        const list = this.getStudyLog();
        const idx = list.findIndex(l => l.id === logId);
        if (idx !== -1) {
          const removed = list.splice(idx, 1)[0];
          App.saveToStorage();
          return removed;
        }
        return null;
      },

      updateLog(logId, updates) {
        const list = this.getStudyLog();
        const log = list.find(l => l.id === logId);
        if (log) {
          if (updates.minutos !== undefined) log.minutos = Math.max(1, Math.round(Number(updates.minutos) || 1));
          if (updates.data) log.data = updates.data;
          log.updatedAt = new Date().toISOString();
          App.saveToStorage();
          return log;
        }
        return null;
      },

            getTotalMinutesForTopic(arg1, arg2) {
        const topicoId = arg2 ? arg2 : arg1;
        if (!topicoId) return 0;
        const list = this.getStudyLog();
        return list.filter(l => l.topicoId === topicoId).reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
      },

      getTotalMinutesForSubject(materiaId) {
        if (!materiaId) return 0;
        const list = this.getStudyLog();
        return list.filter(l => l.materiaId === materiaId).reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
      },

      getTotalStudyMinutes() {
        const list = this.getStudyLog();
        return list.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
      },

      // Garante ID persistente para cada tópico
      ensureTopicId(materia, topic, index) {
        if (!topic) return '';
        if (typeof topic === 'object') {
          if (!topic.id) {
            topic.id = 'top_' + (idMateria(materia) || 'mat') + '_' + (topic.numero ? String(topic.numero).replace(/\./g, '_') : index) + '_' + Math.random().toString(36).substring(2, 7);
          }
          return topic.id;
        }
        return 'top_str_' + (idMateria(materia) || 'mat') + '_' + index;
      },

      // Rateio dinâmico para sessões do cronograma (Regra 1)
      handleSessionCompleted(slot, isCompleted) {
        if (!slot || !slot.slotKey) return;
        const list = this.getStudyLog();

        if (!isCompleted) {
          // Remove todos os registros desta sessão
          const removed = list.filter(l => l.sessaoId === slot.slotKey);
          App.studyLog = list.filter(l => l.sessaoId !== slot.slotKey);
          
          // Desmarca tópicos se não tiverem outro estudo
          if (slot.subjectId && App.data && App.data.materias) {
            const materia = App.data.materias.find(m => idMateria(m) === slot.subjectId);
            if (materia && Array.isArray(materia.topicos)) {
              removed.forEach(r => {
                const topic = materia.topicos.find(t => (typeof t === 'object' && t.id === r.topicoId));
                if (topic) {
                  const remaining = App.studyLog.filter(l => l.topicoId === topic.id);
                  if (remaining.length === 0) {
                    topic.concluido = false;
                  }
                }
              });
            }
          }

          App.saveToStorage();
          if (removed.length > 0) {
            const totalM = removed.reduce((a, b) => a + b.minutos, 0);
            App.showToast(`Sessão desmarcada (-${this.formatMinutes(totalM)}). <button class="toast-undo-btn" onclick="StudyHoursManager.undoSessionUncheck('${slot.slotKey}', ${JSON.stringify(removed).replace(/"/g, '&quot;')})">Desfazer</button>`, 'info');
          }
          this.renderTab();
          App.renderSubjects();
          return;
        }

        // Concluindo a sessão
        const duration = parseInt(slot.duration || (App.schedule ? App.schedule.blockDuration : 60) || 60, 10);
        const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === slot.subjectId) : null;
        const rawTopic = (slot.topic || '').trim();

        // Identifica tópicos associados a esta sessão
        let topicsToRecord = [];
        if (materia && Array.isArray(materia.topicos) && materia.topicos.length > 0) {
          // Garante IDs
          materia.topicos.forEach((t, i) => this.ensureTopicId(materia, t, i));

          if (!rawTopic || rawTopic === 'Estudo e resolução de questões') {
            // Se não especificou tópico, busca o primeiro não concluído ou o primeiro
            const notDone = materia.topicos.find(t => typeof t === 'object' && !t.concluido);
            topicsToRecord.push(notDone || materia.topicos[0]);
          } else {
            // Quebra tópicos por vírgula, ponto e vírgula ou nova linha
            const parts = rawTopic.split(/[,;\n]+/).map(p => p.trim()).filter(Boolean);
            parts.forEach(part => {
              const matched = materia.topicos.find(t => {
                const tx = (App.getTopicText(t) || '').trim().toLowerCase();
                return tx === part.toLowerCase() || tx.includes(part.toLowerCase()) || part.toLowerCase().includes(tx);
              });
              if (matched) {
                if (!topicsToRecord.includes(matched)) topicsToRecord.push(matched);
              } else {
                topicsToRecord.push({
                  id: 'top_adhoc_' + (materia.id || 'mat') + '_' + Math.random().toString(36).substring(2, 7),
                  texto: part,
                  concluido: true
                });
              }
            });
          }
        } else {
          // Matéria sem tópicos ainda
          topicsToRecord.push({
            id: 'top_adhoc_' + (slot.subjectId || 'mat') + '_1',
            texto: rawTopic || ('Estudo de ' + (slot.subjectName || 'Disciplina')),
            concluido: true
          });
        }

        if (topicsToRecord.length === 0) return;

        // Rateio dinâmico do tempo da sessão entre os tópicos concluídos
        const totalTopics = topicsToRecord.length;
        const minPerTopic = Math.floor(duration / totalTopics);
        let remainder = duration % totalTopics;

        // Remove registros prévios desta sessão para idempotência
        App.studyLog = list.filter(l => l.sessaoId !== slot.slotKey);

        topicsToRecord.forEach((top, idx) => {
          const tMin = minPerTopic + (remainder > 0 ? 1 : 0);
          if (remainder > 0) remainder--;

          const topId = typeof top === 'object' ? (top.id || this.ensureTopicId(materia, top, idx)) : ('top_' + idx);
          const topName = App.getTopicText(top) || rawTopic;

          this.addLogEntry({
            id: 'log_sess_' + slot.slotKey + '_' + idx,
            topicoId: topId,
            topicoNome: topName,
            materiaId: slot.subjectId,
            materiaNome: slot.subjectName || (materia ? nomeMateria(materia) : 'Disciplina'),
            minutos: tMin,
            data: this.getLocalDateString(),
            criadoEm: this.getLocalDateTimeString(),
            sessaoId: slot.slotKey,
            origem: 'sessao'
          });

          if (typeof top === 'object') top.concluido = true;
        });

        App.saveToStorage();
        this.renderTab();
        App.renderSubjects();
      },

      
      // Recálculo dinâmico da sessão entre tópicos restantes (Regra 1 e Teste 1)
      recalculateSessionRateio(sessaoId, optRemovedDuration = 0) {
        if (!sessaoId) return;
        const list = this.getStudyLog();
        const sessionLogs = list.filter(l => l.sessaoId === sessaoId);
        if (sessionLogs.length === 0) {
          if (App.completedSlots && App.completedSlots[sessaoId]) {
            delete App.completedSlots[sessaoId];
            if (typeof App.renderScheduleProgress === 'function') App.renderScheduleProgress();
          }
          return;
        }

        let totalDuration = 0;
        if (App.schedule && Array.isArray(App.schedule.columns)) {
          for (const col of App.schedule.columns) {
            const s = (col.slots || []).find(x => x.slotKey === sessaoId);
            if (s) {
              totalDuration = parseInt(s.duration || (App.schedule ? App.schedule.blockDuration : 60) || 60, 10);
              break;
            }
          }
        }
        if (!totalDuration) {
          totalDuration = sessionLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0) + (Number(optRemovedDuration) || 0);
        }

        const count = sessionLogs.length;
        const perTopic = Math.floor(totalDuration / count);
        let rem = totalDuration % count;

        sessionLogs.forEach(l => {
          l.minutos = perTopic + (rem > 0 ? 1 : 0);
          if (rem > 0) rem--;
          l.updatedAt = new Date().toISOString();
        });

        App.saveToStorage();
      },

      // Mesclagem segura de logs da nuvem (Parte 3)
      applyCloudLogs(cloudLogs) {
        if (!Array.isArray(cloudLogs)) return;
        const local = this.getStudyLog();
        const map = new Map();
        local.forEach(l => { if (l && l.id) map.set(l.id, l); });
        cloudLogs.forEach(cl => {
          if (!cl || !cl.id) return;
          const ex = map.get(cl.id);
          if (!ex) {
            map.set(cl.id, cl);
          } else {
            const cTime = cl.updatedAt ? new Date(cl.updatedAt).getTime() : 0;
            const lTime = ex.updatedAt ? new Date(ex.updatedAt).getTime() : 0;
            if (cTime >= lTime) {
              map.set(cl.id, cl);
            }
          }
        });
        App.studyLog = Array.from(map.values());
        try {
          localStorage.setItem('concurso_study_log', JSON.stringify(App.studyLog));
        } catch (e) {}
        this.renderTab();
        if (typeof App.renderSubjects === 'function') App.renderSubjects();
      },

      undoSessionUncheck(slotKey, logsRestored) {
        if (!logsRestored || !Array.isArray(logsRestored)) return;
        App.completedSlots[slotKey] = true;
        logsRestored.forEach(l => {
          this.addLogEntry(l);
          if (l.materiaId && App.data && App.data.materias) {
            const materia = App.data.materias.find(m => idMateria(m) === l.materiaId);
            if (materia && Array.isArray(materia.topicos)) {
              const topic = materia.topicos.find(t => typeof t === 'object' && t.id === l.topicoId);
              if (topic) topic.concluido = true;
            }
          }
        });
        App.saveToStorage();
        App.showToast('Sessão restaurada com sucesso!', 'success');
        this.renderTab();
        App.renderSubjects();
        App.renderScheduleProgress();
      },

      // Modal Rápido de Registro (Regra 2 & 5)
      openQuickLogModal(materiaId, topicIndex, isExtra = false) {
        const materia = (App.data.materias || []).find(m => idMateria(m) === materiaId);
        if (!materia) return;
        const topic = (materia.topicos || [])[topicIndex];
        if (!topic && topicIndex !== null) return;

        const topicId = topic ? this.ensureTopicId(materia, topic, topicIndex) : '';
        const topicText = topic ? App.getTopicText(topic) : (nomeMateria(materia) + ' - Estudo Geral');

        this.activeQuickLogMeta = { materiaId, topicIndex, topicId, topicText, isExtra };

        const modal = document.getElementById('modalQuickLogTime');
        const title = document.getElementById('modalQuickLogTitle');
        const badge = document.getElementById('quickLogSubjectBadge');
        const topicEl = document.getElementById('quickLogTopicText');
        const inputMin = document.getElementById('inputQuickLogMinutes');
        const inputDate = document.getElementById('inputQuickLogDate');
        const checkAuto = document.getElementById('checkQuickLogDoNotAskAgain');

        if (title) {
          title.textContent = isExtra ? '⏱️ Registrar Mais Tempo de Estudo' : '⏱️ Quanto tempo você estudou?';
        }
        if (badge) {
          const pal = App.getPalette(materia.paletteId);
          badge.textContent = nomeMateria(materia);
          badge.style.background = pal.bg;
          badge.style.color = pal.text;
          badge.style.border = `1px solid ${pal.border}`;
        }
        if (topicEl) {
          topicEl.textContent = topicText;
        }
        if (inputMin) {
          inputMin.value = String(this.defaultMinutes);
        }
        if (inputDate) {
          inputDate.value = this.getLocalDateString();
        }
        if (checkAuto) {
          checkAuto.checked = this.autoQuickMark;
        }

        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('open');
        }
      },

      setQuickLogMinutes(mins) {
        const inputMin = document.getElementById('inputQuickLogMinutes');
        if (inputMin) inputMin.value = String(mins);
      },

      closeQuickLogModal() {
        const modal = document.getElementById('modalQuickLogTime');
        if (modal) {
          modal.classList.remove('open');
          modal.classList.add('hidden');
        }
        // Se cancelou e não era tempo extra, desmarca o checkbox
        if (this.activeQuickLogMeta && !this.activeQuickLogMeta.isExtra) {
          const { materiaId, topicIndex } = this.activeQuickLogMeta;
          const materia = (App.data.materias || []).find(m => idMateria(m) === materiaId);
          if (materia && materia.topicos && materia.topicos[topicIndex]) {
            materia.topicos[topicIndex].concluido = false;
            App.renderSubjects();
          }
        }
        this.activeQuickLogMeta = null;
      },

      confirmQuickLog() {
        if (!this.activeQuickLogMeta) return;
        const { materiaId, topicIndex, topicId, topicText } = this.activeQuickLogMeta;
        const materia = (App.data.materias || []).find(m => idMateria(m) === materiaId);
        if (!materia) return;

        const inputMin = document.getElementById('inputQuickLogMinutes');
        const inputDate = document.getElementById('inputQuickLogDate');
        const checkAuto = document.getElementById('checkQuickLogDoNotAskAgain');

        const mins = parseInt(inputMin ? inputMin.value : this.defaultMinutes, 10) || this.defaultMinutes;
        const chosenDate = (inputDate && inputDate.value) ? inputDate.value : this.getLocalDateString();

        if (checkAuto && checkAuto.checked) {
          this.autoQuickMark = true;
          this.saveSettings();
        }

        // Adiciona registro de estudo
        this.addLogEntry({
          topicoId: topicId,
          topicoNome: topicText,
          materiaId: materiaId,
          materiaNome: nomeMateria(materia),
          minutos: mins,
          data: chosenDate,
          criadoEm: this.getLocalDateTimeString(),
          origem: 'manual'
        });

        if (topicIndex !== null && materia.topicos && materia.topicos[topicIndex]) {
          materia.topicos[topicIndex].concluido = true;
        }

        App.saveToStorage();
        this.closeQuickLogModal();
        App.showToast(`Estudo registrado: ${this.formatMinutes(mins)}!`, 'success');
        this.renderTab();
        App.renderSubjects();
      },

      // Alternar conclusão de tópico na lista de matérias (Regra 2, 4)
      toggleTopic(materiaId, topicIndex) {
        const materia = (App.data.materias || []).find(m => idMateria(m) === materiaId);
        if (!materia || !materia.topicos || !materia.topicos[topicIndex]) return;

        const topic = materia.topicos[topicIndex];
        const isDone = !!topic.concluido;
        const topicId = this.ensureTopicId(materia, topic, topicIndex);

        if (isDone) {
          // Desmarcando tópico (Regra 4)
          topic.concluido = false;

          // Remove o registro mais recente gerado para este tópico
          const list = this.getStudyLog();
          const topicLogs = list.filter(l => l.topicoId === topicId);
          let removedLog = null;
          if (topicLogs.length > 0) {
            removedLog = topicLogs[topicLogs.length - 1];
            this.removeLogById(removedLog.id);
          }

          App.saveToStorage();
          App.renderSubjects();
          this.renderTab();

          if (removedLog) {
            if (removedLog.sessaoId) {
              const remainingSessionLogs = this.getStudyLog().filter(l => l.sessaoId === removedLog.sessaoId);
              if (remainingSessionLogs.length > 0) {
                const totalSessionMinutes = remainingSessionLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0) + (Number(removedLog.minutos) || 0);
                const count = remainingSessionLogs.length;
                const minPerTopic = Math.floor(totalSessionMinutes / count);
                let remainder = totalSessionMinutes % count;
                remainingSessionLogs.forEach(l => {
                  l.minutos = minPerTopic + (remainder > 0 ? 1 : 0);
                  if (remainder > 0) remainder--;
                  l.updatedAt = new Date().toISOString();
                });
              } else {
                if (App.completedSlots && App.completedSlots[removedLog.sessaoId]) {
                  delete App.completedSlots[removedLog.sessaoId];
                }
              }
            }

            this.lastUndone = { log: removedLog, materiaId, topicIndex };
            App.showToast(`Estudo desmarcado (-${this.formatMinutes(removedLog.minutos)}). <button class="toast-undo-btn" onclick="StudyHoursManager.undoTopicUncheck()">Desfazer</button>`, 'info');
            clearTimeout(this.undoTimer);
            this.undoTimer = setTimeout(() => { this.lastUndone = null; }, 6000);
          }
        } else {
          // Marcando tópico (Regra 2)
          if (this.autoQuickMark) {
            // Registro em 1 toque com o tempo padrão
            topic.concluido = true;
            this.addLogEntry({
              topicoId: topicId,
              topicoNome: App.getTopicText(topic),
              materiaId: materiaId,
              materiaNome: nomeMateria(materia),
              minutos: this.defaultMinutes,
              data: this.getLocalDateString(),
              criadoEm: this.getLocalDateTimeString(),
              origem: 'manual'
            });
            App.saveToStorage();
            App.renderSubjects();
            this.renderTab();
            App.showToast(`Estudo registrado: ${this.formatMinutes(this.defaultMinutes)}!`, 'success');
          } else {
            // Abre janelinha rápida
            this.openQuickLogModal(materiaId, topicIndex, false);
          }
        }
      },

      undoTopicUncheck() {
        if (!this.lastUndone || !this.lastUndone.log) return;
        const { log, materiaId, topicIndex } = this.lastUndone;
        this.addLogEntry(log);

        if (log.sessaoId) {
          const sessionLogs = this.getStudyLog().filter(l => l.sessaoId === log.sessaoId);
          if (sessionLogs.length > 1) {
            const totalSessionMinutes = sessionLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
            const count = sessionLogs.length;
            const minPerTopic = Math.floor(totalSessionMinutes / count);
            let remainder = totalSessionMinutes % count;
            sessionLogs.forEach(l => {
              l.minutos = minPerTopic + (remainder > 0 ? 1 : 0);
              if (remainder > 0) remainder--;
              l.updatedAt = new Date().toISOString();
            });
          }
          if (App.completedSlots) {
            App.completedSlots[log.sessaoId] = true;
          }
        }

        const materia = (App.data.materias || []).find(m => idMateria(m) === materiaId);
        if (materia && materia.topicos && materia.topicos[topicIndex]) {
          materia.topicos[topicIndex].concluido = true;
        }

        this.lastUndone = null;
        clearTimeout(this.undoTimer);
        App.saveToStorage();
        App.showToast('Estudo restaurado!', 'success');
        App.renderSubjects();
        this.renderTab();
      },

      // Navegação de Períodos da Aba
      setPeriod(p) {
        this.period = p;
        document.querySelectorAll('.study-period-btn').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-period') === p);
        });
        this.renderTab();
      },

      navigatePeriod(diff) {
        const d = new Date(this.currentDate);
        if (this.period === 'dia') {
          d.setDate(d.getDate() + diff);
        } else if (this.period === 'semana') {
          d.setDate(d.getDate() + (diff * 7));
        } else if (this.period === 'mes') {
          d.setMonth(d.getMonth() + diff);
        }
        this.currentDate = d;
        this.renderTab();
      },

      setToday() {
        this.currentDate = new Date();
        this.renderTab();
      },

      onDatePicked(val) {
        if (!val) return;
        this.currentDate = this.parseLocalDateString(val);
        this.renderTab();
      },

      setSubjectFilter(sId) {
        this.selectedSubjectId = sId;
        this.renderTab();
      },

      setShowUnstudied(val) {
        this.showUnstudied = !!val;
        this.renderTab();
      },

      // Filtra os logs pelo período e matéria
      getFilteredLogs() {
        const allLogs = this.getStudyLog();
        const cur = this.currentDate;
        let startStr = '', endStr = '';

        if (this.period === 'dia') {
          const dStr = this.getLocalDateString(cur);
          return allLogs.filter(l => {
            if (l.data !== dStr) return false;
            if (this.selectedSubjectId && l.materiaId !== this.selectedSubjectId) return false;
            return true;
          });
        }

        if (this.period === 'semana') {
          const range = this.getWeekRange(cur);
          startStr = range.startStr;
          endStr = range.endStr;
        } else if (this.period === 'mes') {
          const range = this.getMonthRange(cur.getFullYear(), cur.getMonth());
          startStr = range.startStr;
          endStr = range.endStr;
        }

        return allLogs.filter(l => {
          if (startStr && endStr) {
            if (l.data < startStr || l.data > endStr) return false;
          }
          if (this.selectedSubjectId && l.materiaId !== this.selectedSubjectId) return false;
          return true;
        });
      },

      // Renderização Completa da Aba "Horas de Estudo"
      renderTab() {
        this.renderPeriodControls();
        const logs = this.getFilteredLogs();
        this.renderSummaryCards(logs);
        this.renderChart(logs);
        this.renderDayTimeline(logs);
        this.renderSubjectsAccordion(logs);
        this.updateSettingsCard();
      },

      renderPeriodControls() {
        const label = document.getElementById('studyPeriodLabel');
        const picker = document.getElementById('studyDatePicker');
        const subSelect = document.getElementById('studySubjectFilter');
        const unstudiedCheck = document.getElementById('checkShowUnstudiedTopics');

        if (picker) {
          picker.value = this.getLocalDateString(this.currentDate);
        }

        if (label) {
          const cur = this.currentDate;
          const todayStr = this.getLocalDateString();
          const curStr = this.getLocalDateString(cur);

          if (this.period === 'dia') {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yestStr = this.getLocalDateString(yesterday);

            if (curStr === todayStr) {
              label.textContent = `Hoje, ${cur.getDate()} de ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][cur.getMonth()]}`;
            } else if (curStr === yestStr) {
              label.textContent = `Ontem, ${cur.getDate()} de ${['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][cur.getMonth()]}`;
            } else {
              label.textContent = this.formatDateReadable(cur);
            }
          } else if (this.period === 'semana') {
            const range = this.getWeekRange(cur);
            const m = range.monday;
            const s = range.sunday;
            const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
            if (m.getMonth() === s.getMonth()) {
              label.textContent = `${m.getDate()} a ${s.getDate()} de ${meses[m.getMonth()]}`;
            } else {
              label.textContent = `${m.getDate()} de ${meses[m.getMonth()]} a ${s.getDate()} de ${meses[s.getMonth()]}`;
            }
          } else if (this.period === 'mes') {
            const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            label.textContent = `${mesesCompletos[cur.getMonth()]} de ${cur.getFullYear()}`;
          } else if (this.period === 'total') {
            label.textContent = 'Todo o Histórico';
          }
        }

        if (subSelect) {
          const prevVal = this.selectedSubjectId;
          const materias = (App.data && App.data.materias) ? App.data.materias : [];
          subSelect.innerHTML = '<option value="">📁 Todas as matérias</option>' + materias.map(m => {
            const id = idMateria(m);
            const name = nomeMateria(m);
            return `<option value="${id}" ${id === prevVal ? 'selected' : ''}>${App.escapeHtml(name)}</option>`;
          }).join('');
        }

        if (unstudiedCheck) {
          unstudiedCheck.checked = this.showUnstudied;
        }
      },

      renderSummaryCards(logs) {
        const totalMinutes = logs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
        const daysSet = new Set(logs.map(l => l.data));
        const daysCount = daysSet.size;
        const avgPerDay = daysCount > 0 ? Math.round(totalMinutes / daysCount) : 0;

        // Identifica matéria mais estudada
        const bySubject = {};
        logs.forEach(l => {
          const sId = l.materiaId || 'outras';
          bySubject[sId] = (bySubject[sId] || 0) + (Number(l.minutos) || 0);
        });

        let topSubjectName = 'Nenhuma';
        let topSubjectMax = 0;
        Object.keys(bySubject).forEach(sId => {
          if (bySubject[sId] > topSubjectMax) {
            topSubjectMax = bySubject[sId];
            const found = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === sId) : null;
            if (found) {
              topSubjectName = nomeMateria(found);
            } else {
              const anyLog = logs.find(l => l.materiaId === sId);
              topSubjectName = anyLog ? anyLog.materiaNome : 'Disciplina';
            }
          }
        });

        const elTot = document.getElementById('studyMetricTotalHours');
        const elDays = document.getElementById('studyMetricDaysCount');
        const elAvg = document.getElementById('studyMetricAvgPerDay');
        const elTop = document.getElementById('studyMetricTopSubject');

        if (elTot) elTot.textContent = this.formatMinutes(totalMinutes);
        if (elDays) elDays.textContent = `${daysCount} dia${daysCount === 1 ? '' : 's'}`;
        if (elAvg) elAvg.textContent = this.formatMinutes(avgPerDay);
        if (elTop) {
          elTop.textContent = topSubjectMax > 0 ? `${topSubjectName} (${this.formatMinutes(topSubjectMax)})` : 'Nenhuma';
          elTop.title = topSubjectName;
        }
      },

      // Gráfico em SVG Limpo, Responsivo e com Estilo Curado para os 2 Temas
      renderChart(logs) {
        const container = document.getElementById('studyChartContainer');
        const titleEl = document.getElementById('studyChartTitle');
        const subTitleEl = document.getElementById('studyChartSubtitle');
        if (!container) return;

        const totalMinutes = logs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);

        if (this.period === 'semana') {
          if (titleEl) titleEl.textContent = '📈 Horas por Dia da Semana';
          if (subTitleEl) subTitleEl.textContent = 'Segunda a Domingo';

          const range = this.getWeekRange(this.currentDate);
          const diasNomes = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
          const diasDates = [];
          for (let i = 0; i < 7; i++) {
            const dt = new Date(range.monday);
            dt.setDate(dt.getDate() + i);
            diasDates.push(dt);
          }

          const dayMinutes = diasDates.map(dt => {
            const dStr = this.getLocalDateString(dt);
            return logs.filter(l => l.data === dStr).reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
          });

          const maxM = Math.max(60, ...dayMinutes);
          const todayStr = this.getLocalDateString();

          const svgWidth = 350;
          const svgHeight = 170;
          const chartH = 110;
          const barW = 34;
          const gap = (svgWidth - (barW * 7)) / 8;

          let barsSvg = '';
          diasDates.forEach((dt, i) => {
            const dStr = this.getLocalDateString(dt);
            const isToday = (dStr === todayStr);
            const mins = dayMinutes[i];
            const h = maxM > 0 ? Math.max(mins > 0 ? 6 : 2, Math.round((mins / maxM) * chartH)) : 2;
            const x = gap + i * (barW + gap);
            const y = chartH - h + 25;

            const barColor = isToday ? 'var(--primary)' : (mins > 0 ? 'rgba(99, 102, 241, 0.75)' : 'var(--border-color)');
            const labelColor = isToday ? 'var(--primary)' : 'var(--text-muted)';
            const labelWeight = isToday ? '700' : '500';

            barsSvg += `
              <g class="chart-col" title="${diasNomes[i]} (${dt.getDate()}): ${this.formatMinutes(mins)}">
                <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5" ry="5" fill="${barColor}" class="study-chart-bar" />
                ${mins > 0 ? `<text x="${x + barW/2}" y="${y - 6}" class="study-chart-val" font-size="10">${this.formatMinutes(mins)}</text>` : ''}
                <text x="${x + barW/2}" y="${svgHeight - 14}" class="study-chart-label" fill="${labelColor}" font-weight="${labelWeight}">${diasNomes[i]}</text>
                <text x="${x + barW/2}" y="${svgHeight - 2}" font-size="9" fill="${labelColor}" text-anchor="middle">${dt.getDate()}</text>
                ${isToday ? `<circle cx="${x + barW/2}" cy="${svgHeight - 25}" r="2.5" class="study-chart-today-dot" />` : ''}
              </g>
            `;
          });

          container.innerHTML = `
            <svg class="study-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
              <line x1="10" y1="${chartH + 25}" x2="${svgWidth - 10}" y2="${chartH + 25}" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" />
              ${barsSvg}
            </svg>
          `;
        } else if (this.period === 'dia') {
          if (titleEl) titleEl.textContent = '📈 Horas por Matéria no Dia';
          if (subTitleEl) subTitleEl.textContent = this.formatDateReadable(this.currentDate);

          // Agrupa por matérias estudadas no dia
          const subjMap = {};
          logs.forEach(l => {
            const sId = l.materiaId || 'outras';
            subjMap[sId] = (subjMap[sId] || 0) + (Number(l.minutos) || 0);
          });
          const subjIds = Object.keys(subjMap);

          if (subjIds.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.88rem; padding: 20px;">Nenhum estudo registrado neste dia.</div>`;
            return;
          }

          const maxM = Math.max(30, ...Object.values(subjMap));
          const svgWidth = Math.max(300, subjIds.length * 75);
          const svgHeight = 170;
          const chartH = 110;
          const barW = Math.min(50, Math.floor((svgWidth - 40) / subjIds.length) - 15);
          const gap = (svgWidth - (barW * subjIds.length)) / (subjIds.length + 1);

          let barsSvg = '';
          subjIds.forEach((sId, i) => {
            const mins = subjMap[sId];
            const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === sId) : null;
            const sName = materia ? nomeMateria(materia) : 'Disciplina';
            const pal = materia ? App.getPalette(materia.paletteId) : { border: 'var(--primary)', text: 'var(--primary)' };
            const h = Math.max(mins > 0 ? 8 : 2, Math.round((mins / maxM) * chartH));
            const x = gap + i * (barW + gap);
            const y = chartH - h + 25;

            const shortLabel = sName.length > 7 ? sName.slice(0, 6) + '…' : sName;

            barsSvg += `
              <g class="chart-col" title="${App.escapeHtml(sName)}: ${this.formatMinutes(mins)}">
                <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" ry="6" fill="${pal.border || 'var(--primary)'}" class="study-chart-bar" />
                <text x="${x + barW/2}" y="${y - 6}" class="study-chart-val" font-size="10">${this.formatMinutes(mins)}</text>
                <text x="${x + barW/2}" y="${svgHeight - 10}" class="study-chart-label" font-size="10">${App.escapeHtml(shortLabel)}</text>
              </g>
            `;
          });

          container.innerHTML = `
            <svg class="study-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
              <line x1="10" y1="${chartH + 25}" x2="${svgWidth - 10}" y2="${chartH + 25}" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" />
              ${barsSvg}
            </svg>
          `;
        } else if (this.period === 'mes') {
          if (titleEl) titleEl.textContent = '📈 Evolução Diária no Mês';
          const mesesCompletos = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
          if (subTitleEl) subTitleEl.textContent = `${mesesCompletos[this.currentDate.getMonth()]} de ${this.currentDate.getFullYear()}`;

          const year = this.currentDate.getFullYear();
          const month = this.currentDate.getMonth();
          const daysInMonth = new Date(year, month + 1, 0).getDate();

          const daysData = [];
          for (let d = 1; d <= daysInMonth; d++) {
            const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const mins = logs.filter(l => l.data === dStr).reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
            daysData.push({ day: d, dateStr: dStr, mins });
          }

          const maxM = Math.max(60, ...daysData.map(d => d.mins));
          const todayStr = this.getLocalDateString();

          const svgWidth = 350;
          const svgHeight = 160;
          const chartH = 100;
          const barW = Math.max(5, (svgWidth - 20) / daysInMonth - 2.5);
          const gap = ((svgWidth - 20) - (barW * daysInMonth)) / (daysInMonth - 1);

          let barsSvg = '';
          daysData.forEach((dItem, i) => {
            const isToday = (dItem.dateStr === todayStr);
            const h = dItem.mins > 0 ? Math.max(6, Math.round((dItem.mins / maxM) * chartH)) : 2;
            const x = 10 + i * (barW + gap);
            const y = chartH - h + 25;
            const barColor = isToday ? 'var(--primary)' : (dItem.mins > 0 ? 'rgba(99, 102, 241, 0.75)' : 'var(--border-color)');

            barsSvg += `
              <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" ry="2" fill="${barColor}" class="study-chart-bar" title="Dia ${dItem.day}: ${this.formatMinutes(dItem.mins)}" />
            `;
          });

          container.innerHTML = `
            <svg class="study-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
              <line x1="10" y1="${chartH + 25}" x2="${svgWidth - 10}" y2="${chartH + 25}" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" />
              ${barsSvg}
              <text x="12" y="${svgHeight - 10}" class="study-chart-label" text-anchor="start">Dia 1</text>
              <text x="${svgWidth / 2}" y="${svgHeight - 10}" class="study-chart-label" text-anchor="middle">Dia 15</text>
              <text x="${svgWidth - 12}" y="${svgHeight - 10}" class="study-chart-label" text-anchor="end">Dia ${daysInMonth}</text>
            </svg>
          `;
        } else {
          // Total
          if (titleEl) titleEl.textContent = '📈 Total Estudado por Disciplina';
          if (subTitleEl) subTitleEl.textContent = 'Histórico Geral Completo';

          const subjMap = {};
          logs.forEach(l => {
            const sId = l.materiaId || 'outras';
            subjMap[sId] = (subjMap[sId] || 0) + (Number(l.minutos) || 0);
          });
          const subjIds = Object.keys(subjMap);

          if (subjIds.length === 0) {
            container.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.88rem; padding: 20px;">Nenhum registro de estudo ainda.</div>`;
            return;
          }

          const maxM = Math.max(30, ...Object.values(subjMap));
          const svgWidth = Math.max(300, subjIds.length * 75);
          const svgHeight = 170;
          const chartH = 110;
          const barW = Math.min(50, Math.floor((svgWidth - 40) / subjIds.length) - 15);
          const gap = (svgWidth - (barW * subjIds.length)) / (subjIds.length + 1);

          let barsSvg = '';
          subjIds.forEach((sId, i) => {
            const mins = subjMap[sId];
            const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === sId) : null;
            const sName = materia ? nomeMateria(materia) : 'Disciplina';
            const pal = materia ? App.getPalette(materia.paletteId) : { border: 'var(--primary)', text: 'var(--primary)' };
            const h = Math.max(mins > 0 ? 8 : 2, Math.round((mins / maxM) * chartH));
            const x = gap + i * (barW + gap);
            const y = chartH - h + 25;

            const shortLabel = sName.length > 7 ? sName.slice(0, 6) + '…' : sName;

            barsSvg += `
              <g class="chart-col" title="${App.escapeHtml(sName)}: ${this.formatMinutes(mins)}">
                <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="6" ry="6" fill="${pal.border || 'var(--primary)'}" class="study-chart-bar" />
                <text x="${x + barW/2}" y="${y - 6}" class="study-chart-val" font-size="10">${this.formatMinutes(mins)}</text>
                <text x="${x + barW/2}" y="${svgHeight - 10}" class="study-chart-label" font-size="10">${App.escapeHtml(shortLabel)}</text>
              </g>
            `;
          });

          container.innerHTML = `
            <svg class="study-chart-svg" viewBox="0 0 ${svgWidth} ${svgHeight}" preserveAspectRatio="xMidYMid meet">
              <line x1="10" y1="${chartH + 25}" x2="${svgWidth - 10}" y2="${chartH + 25}" stroke="var(--border-color)" stroke-width="1.5" stroke-linecap="round" />
              ${barsSvg}
            </svg>
          `;
        }
      },

      // Linha do Tempo Cronológica do Dia (Regra 6 da Parte 2)
      renderDayTimeline(logs) {
        const timelineCard = document.getElementById('studyDayTimelineCard');
        const timelineList = document.getElementById('studyDayTimelineList');
        if (!timelineCard || !timelineList) return;

        if (this.period !== 'dia') {
          timelineCard.style.display = 'none';
          return;
        }

        timelineCard.style.display = 'block';

        if (logs.length === 0) {
          timelineList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 12px;">Nenhum estudo registrado neste dia.</div>`;
          return;
        }

        // Ordena cronologicamente por criadoEm ou id
        const sorted = [...logs].sort((a, b) => (a.criadoEm || '').localeCompare(b.criadoEm || ''));

        timelineList.innerHTML = sorted.map(l => {
          const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === l.materiaId) : null;
          const sName = materia ? nomeMateria(materia) : (l.materiaNome || 'Disciplina');
          const pal = materia ? App.getPalette(materia.paletteId) : { border: 'var(--primary)', bg: 'var(--bg-subtle)', text: 'var(--text-main)' };
          const timePart = l.criadoEm ? l.criadoEm.split(' ')[1] || '' : '';
          const origemText = l.origem === 'sessao' ? '🗓️ Sessão do Cronograma' : '✏️ Registro Manual';

          return `
            <div class="study-timeline-item">
              <div class="study-timeline-item-left">
                <div class="study-timeline-item-time">${timePart ? timePart.slice(0, 5) + ' • ' : ''}${origemText}</div>
                <div class="study-timeline-item-subject">
                  <span style="width: 8px; height: 8px; border-radius: 50%; background: ${pal.border || 'var(--primary)'};"></span>
                  <span>${App.escapeHtml(sName)}</span>
                </div>
                <div class="study-timeline-item-topic" title="${App.escapeHtml(l.topicoNome || '')}">
                  ${App.escapeHtml(l.topicoNome || '(Sem tópico específico)')}
                </div>
              </div>
              <div class="study-timeline-item-actions">
                <span class="study-topic-time-badge">${this.formatMinutes(l.minutos)}</span>
                <button type="button" class="btn-icon" onclick="StudyHoursManager.openEditLogModal('${l.id}')" title="Editar este registro">✏️</button>
                <button type="button" class="btn-icon danger" onclick="StudyHoursManager.deleteLogPrompt('${l.id}')" title="Excluir este registro">🗑️</button>
              </div>
            </div>
          `;
        }).join('');
      },

      // Lista por Matéria com Acordeão e Barra Proporcional (Regra 3 da Parte 2)
      renderSubjectsAccordion(logs) {
        const container = document.getElementById('studySubjectsAccordionList');
        const emptyState = document.getElementById('studyEmptyState');
        const badgeEl = document.getElementById('studySubjectsCountBadge');
        if (!container) return;

        const totalMinutesPeriod = logs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
        const materias = (App.data && App.data.materias) ? App.data.materias : [];

        // Agrupa logs por matéria
        const logsBySubject = {};
        logs.forEach(l => {
          const sId = l.materiaId || 'outras';
          if (!logsBySubject[sId]) logsBySubject[sId] = [];
          logsBySubject[sId].push(l);
        });

        // Identifica matérias que têm estudo no período
        let subjectsToDisplay = [];
        materias.forEach(m => {
          const sId = idMateria(m);
          const subjLogs = logsBySubject[sId] || [];
          const sMin = subjLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
          if (sMin > 0 || this.showUnstudied) {
            subjectsToDisplay.push({
              materia: m,
              id: sId,
              name: nomeMateria(m),
              minutos: sMin,
              logs: subjLogs,
              isRemoved: false
            });
          }
        });

        // Inclui registros de matérias que porventura foram removidas (Regra Parte 3)
        Object.keys(logsBySubject).forEach(sId => {
          if (!subjectsToDisplay.some(item => item.id === sId)) {
            const anyLog = logsBySubject[sId][0];
            const sMin = logsBySubject[sId].reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
            subjectsToDisplay.push({
              materia: null,
              id: sId,
              name: (anyLog ? anyLog.materiaNome : 'Disciplina Removida') + ' (removida)',
              minutos: sMin,
              logs: logsBySubject[sId],
              isRemoved: true
            });
          }
        });

        // Ordena matérias por tempo estudado no período (decrescente)
        subjectsToDisplay.sort((a, b) => b.minutos - a.minutos);

        if (badgeEl) {
          badgeEl.textContent = `${subjectsToDisplay.length} disciplina${subjectsToDisplay.length === 1 ? '' : 's'}`;
        }

        if (subjectsToDisplay.length === 0) {
          container.innerHTML = '';
          if (emptyState) emptyState.style.display = 'block';
          return;
        }

        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = subjectsToDisplay.map(item => {
          const { materia, id: sId, name, minutos, logs: subjLogs, isRemoved } = item;
          const pal = materia ? App.getPalette(materia.paletteId) : { border: '#64748b', bg: '#f1f5f9', text: '#334155' };
          const percent = totalMinutesPeriod > 0 ? Math.round((minutos / totalMinutesPeriod) * 100) : 0;
          const isOpen = this.expandedSubjectIds.has(sId);

          // Tópicos da matéria
          const topics = (materia && Array.isArray(materia.topicos)) ? materia.topicos : [];
          
          // Agrupa minutos por tópico
          const topMinutesMap = {};
          const topSessionsCount = {};
          subjLogs.forEach(l => {
            const tId = l.topicoId || 'outros';
            topMinutesMap[tId] = (topMinutesMap[tId] || 0) + (Number(l.minutos) || 0);
            topSessionsCount[tId] = (topSessionsCount[tId] || 0) + 1;
          });

          // Prepara lista de tópicos para mostrar
          let topicsToShow = [];
          topics.forEach((t, idx) => {
            const tId = this.ensureTopicId(materia, t, idx);
            const tMin = topMinutesMap[tId] || 0;
            const tCount = topSessionsCount[tId] || 0;
            const text = App.getTopicText(t);
            if (tMin > 0 || this.showUnstudied) {
              topicsToShow.push({
                id: tId,
                text,
                numero: (typeof t === 'object' && t.numero) ? t.numero : null,
                minutos: tMin,
                count: tCount,
                isDone: typeof t === 'object' ? !!t.concluido : false,
                isRemoved: false
              });
            }
          });

          // Tópicos com logs que foram removidos do edital
          Object.keys(topMinutesMap).forEach(tId => {
            if (!topicsToShow.some(x => x.id === tId)) {
              const anyLog = subjLogs.find(l => l.topicoId === tId);
              topicsToShow.push({
                id: tId,
                text: (anyLog ? anyLog.topicoNome : 'Tópico') + ' (removido)',
                numero: null,
                minutos: topMinutesMap[tId],
                count: topSessionsCount[tId] || 1,
                isDone: true,
                isRemoved: true
              });
            }
          });

          // Ordena tópicos do mais estudado para o menos estudado
          topicsToShow.sort((a, b) => b.minutos - a.minutos);

          return `
            <div class="study-subject-acc-card ${isOpen ? 'open' : ''}" id="studyAccCard-${sId}">
              <div class="study-subject-acc-header" onclick="StudyHoursManager.toggleSubjectAccordion('${sId}')">
                <div class="study-subject-acc-left">
                  <span class="study-subject-acc-color" style="background: ${pal.border}; border: 1.5px solid ${pal.text};"></span>
                  <span class="study-subject-acc-title" title="${App.escapeHtml(name)}">${App.escapeHtml(name)}</span>
                </div>
                <div class="study-subject-acc-right">
                  <span class="study-subject-acc-time">${this.formatMinutes(minutos)}</span>
                  <span class="study-subject-acc-chevron">▼</span>
                </div>
              </div>
              <div class="study-subject-bar-wrap">
                <div class="study-subject-bar-fill" style="width: ${percent}%; background: ${pal.text || 'var(--primary)'};"></div>
              </div>
              <div class="study-subject-acc-body">
                ${topicsToShow.length === 0 ? `
                  <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; padding: 6px;">Nenhum tópico estudado no período.</div>
                ` : topicsToShow.map(t => `
                  <div class="study-topic-row-item" onclick="StudyHoursManager.openTopicHistoryModal('${sId}', '${t.id}', '${App.escapeHtml(t.text).replace(/'/g, "\\'")}')">
                    <div class="study-topic-row-left">
                      <div class="study-topic-row-title" title="${App.escapeHtml(t.text)}">
                        ${t.numero ? `<span style="font-weight: 800; margin-right: 4px; color: var(--primary);">${t.numero}</span>` : ''}
                        ${App.escapeHtml(t.text)}
                      </div>
                      <div class="study-topic-row-meta">
                        ${t.count > 0 ? `${t.count} registro${t.count === 1 ? '' : 's'}` : 'Sem registros no período'}
                      </div>
                    </div>
                    <div class="study-topic-row-right">
                      <span class="study-topic-time-badge">${this.formatMinutes(t.minutos)}</span>
                      <span style="font-size: 0.75rem; color: var(--text-muted);">›</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('');
      },

      toggleSubjectAccordion(sId) {
        if (this.expandedSubjectIds.has(sId)) {
          this.expandedSubjectIds.delete(sId);
        } else {
          this.expandedSubjectIds.add(sId);
        }
        const card = document.getElementById(`studyAccCard-${sId}`);
        if (card) {
          card.classList.toggle('open', this.expandedSubjectIds.has(sId));
        }
      },

      // Modal de Histórico de Estudos do Tópico (Regra 5 da Parte 2)
      openTopicHistoryModal(materiaId, topicoId, optTopicName = '') {
        const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === materiaId) : null;
        let topicText = optTopicName;

        if (materia && Array.isArray(materia.topicos)) {
          const found = materia.topicos.find(t => typeof t === 'object' && t.id === topicoId);
          if (found) topicText = App.getTopicText(found);
        }

        const allLogs = this.getStudyLog();
        const topicLogs = allLogs.filter(l => l.topicoId === topicoId);
        if (!topicText && topicLogs.length > 0) {
          topicText = topicLogs[0].topicoNome || 'Tópico de Estudo';
        }

        this.activeHistoryTopicMeta = { materiaId, topicoId, topicText };

        const modal = document.getElementById('modalTopicStudyHistory');
        const badge = document.getElementById('topicHistorySubjectBadge');
        const titleEl = document.getElementById('topicHistoryTopicTitle');
        const totalEl = document.getElementById('topicHistoryTotalTime');
        const listEl = document.getElementById('topicHistoryEntriesList');

        const sName = materia ? nomeMateria(materia) : (topicLogs[0]?.materiaNome || 'Disciplina');
        const pal = materia ? App.getPalette(materia.paletteId) : { bg: 'var(--pastel-blue-bg)', color: 'var(--pastel-blue-text)', border: 'var(--pastel-blue-border)' };

        if (badge) {
          badge.textContent = sName;
          badge.style.background = pal.bg;
          badge.style.color = pal.text;
          badge.style.border = `1px solid ${pal.border}`;
        }
        if (titleEl) {
          titleEl.textContent = topicText || 'Detalhes do Tópico';
        }

        const totalMins = topicLogs.reduce((acc, l) => acc + (Number(l.minutos) || 0), 0);
        if (totalEl) {
          totalEl.textContent = `${this.formatMinutes(totalMins)} (${topicLogs.length} registro${topicLogs.length === 1 ? '' : 's'})`;
        }

        if (listEl) {
          if (topicLogs.length === 0) {
            listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; padding: 14px;">Nenhum registro de tempo neste tópico ainda.</div>`;
          } else {
            const sorted = [...topicLogs].sort((a, b) => b.data.localeCompare(a.data));
            listEl.innerHTML = sorted.map(l => {
              const origText = l.origem === 'sessao' ? '🗓️ Sessão do Cronograma' : '✏️ Registro Manual';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 8px 12px; gap: 8px;">
                  <div>
                    <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main);">${this.formatDateShort(l.data)} • <span style="color: var(--primary);">${this.formatMinutes(l.minutos)}</span></div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${origText}</div>
                  </div>
                  <div style="display: flex; gap: 4px;">
                    <button type="button" class="btn-icon" onclick="StudyHoursManager.openEditLogModal('${l.id}')" title="Editar data ou minutos">✏️</button>
                    <button type="button" class="btn-icon danger" onclick="StudyHoursManager.deleteLogPrompt('${l.id}')" title="Excluir este registro">🗑️</button>
                  </div>
                </div>
              `;
            }).join('');
          }
        }

        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('open');
        }
      },

      openAddMoreTimeToCurrentTopic() {
        if (!this.activeHistoryTopicMeta) return;
        const { materiaId, topicoId } = this.activeHistoryTopicMeta;
        const materia = (App.data && App.data.materias) ? App.data.materias.find(m => idMateria(m) === materiaId) : null;
        let tIdx = null;
        if (materia && Array.isArray(materia.topicos)) {
          tIdx = materia.topicos.findIndex(t => typeof t === 'object' && t.id === topicoId);
        }
        this.openQuickLogModal(materiaId, tIdx !== -1 ? tIdx : null, true);
      },

      closeTopicHistoryModal() {
        const modal = document.getElementById('modalTopicStudyHistory');
        if (modal) {
          modal.classList.remove('open');
          modal.classList.add('hidden');
        }
        this.activeHistoryTopicMeta = null;
      },

      // Modal de Edição de Registro
      openEditLogModal(logId) {
        const list = this.getStudyLog();
        const log = list.find(l => l.id === logId);
        if (!log) return;

        this.activeEditingLogId = logId;

        const modal = document.getElementById('modalEditStudyLog');
        const topicNameEl = document.getElementById('editLogTopicName');
        const origBadgeEl = document.getElementById('editLogOriginBadge');
        const inputMin = document.getElementById('inputEditLogMinutes');
        const inputDate = document.getElementById('inputEditLogDate');
        const hiddenId = document.getElementById('editLogId');

        if (topicNameEl) topicNameEl.textContent = log.topicoNome || 'Registro de Estudo';
        if (origBadgeEl) origBadgeEl.textContent = `${log.origem === 'sessao' ? '🗓️ Sessão do Cronograma' : '✏️ Registro Manual'} • Matéria: ${log.materiaNome || 'Disciplina'}`;
        if (inputMin) inputMin.value = String(log.minutos);
        if (inputDate) inputDate.value = log.data;
        if (hiddenId) hiddenId.value = log.id;

        if (modal) {
          modal.classList.remove('hidden');
          modal.classList.add('open');
        }
      },

      closeEditLogModal() {
        const modal = document.getElementById('modalEditStudyLog');
        if (modal) {
          modal.classList.remove('open');
          modal.classList.add('hidden');
        }
        this.activeEditingLogId = null;
      },

      saveEditLog() {
        if (!this.activeEditingLogId) return;
        const inputMin = document.getElementById('inputEditLogMinutes');
        const inputDate = document.getElementById('inputEditLogDate');

        const newMins = parseInt(inputMin ? inputMin.value : 30, 10) || 1;
        const newDate = (inputDate && inputDate.value) ? inputDate.value : this.getLocalDateString();

        this.updateLog(this.activeEditingLogId, { minutos: newMins, data: newDate });
        this.closeEditLogModal();
        App.showToast('Registro de estudo atualizado!', 'success');
        this.renderTab();
        App.renderSubjects();

        // Se o modal de histórico do tópico estiver aberto, atualiza-o
        if (this.activeHistoryTopicMeta) {
          this.openTopicHistoryModal(this.activeHistoryTopicMeta.materiaId, this.activeHistoryTopicMeta.topicoId, this.activeHistoryTopicMeta.topicText);
        }
      },

      deleteCurrentEditingLog() {
        if (!this.activeEditingLogId) return;
        this.deleteLogPrompt(this.activeEditingLogId);
        this.closeEditLogModal();
      },

      deleteLogPrompt(logId) {
        if (!confirm('Deseja realmente excluir este registro de estudo?')) return;
        this.removeLogById(logId);
        App.showToast('Registro de estudo excluído.', 'info');
        this.renderTab();
        App.renderSubjects();

        if (this.activeHistoryTopicMeta) {
          this.openTopicHistoryModal(this.activeHistoryTopicMeta.materiaId, this.activeHistoryTopicMeta.topicoId, this.activeHistoryTopicMeta.topicText);
        }
      },

      updateSettingsCard() {
        const selMin = document.getElementById('selectStudyDefaultMinutes');
        const checkQuick = document.getElementById('checkStudyAutoQuick');
        const totalEl = document.getElementById('settingsTotalStudyHours');

        if (selMin) selMin.value = String(this.defaultMinutes);
        if (checkQuick) checkQuick.checked = this.autoQuickMark;
        if (totalEl) totalEl.textContent = this.formatMinutes(this.getTotalStudyMinutes());
      }
    };

    window.StudyHoursManager = StudyHoursManager;