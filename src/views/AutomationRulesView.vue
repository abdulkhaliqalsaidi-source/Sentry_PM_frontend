<template>
  <div class="automation-universe" :dir="$i18n.locale === 'ar' ? 'rtl' : 'ltr'">

    <!-- Top Bar -->
    <header class="floating-top-bar">
      <div class="bar-left">
        <button class="btn-back-orb" @click="$router.push(`/projects/${projectId}`)">
          <i :class="$i18n.locale === 'ar' ? 'fa-solid fa-chevron-right' : 'fa-solid fa-chevron-left'"></i>
        </button>
        <div class="elite-breadcrumbs">
          <span class="crumb" @click="$router.push('/projects')">{{ $t('common.projects') }}</span>
          <i class="fa-solid fa-chevron-right sep"></i>
          <span class="crumb">{{ projectDetails?.name || '...' }}</span>
          <i class="fa-solid fa-chevron-right sep"></i>
          <span class="crumb active">{{ $t('automation.title') }}</span>
        </div>
      </div>
      <div class="bar-right">
        <button @click="openAddModal" class="btn-main-orb success">
          <i class="fa-solid fa-plus"></i>
          <span>{{ $t('automation.newRule') }}</span>
        </button>
      </div>
    </header>

    <main class="main-stage custom-scrollbar">
      <div class="content-padding">

        <!-- Empty State -->
        <div v-if="!loading && rules.length === 0" class="premium-empty-state">
          <div class="pulsing-orb-container">
            <div class="orb-pulse emerald"></div>
            <div class="orb-core emerald"><i class="fa-solid fa-bolt fa-2x"></i></div>
          </div>
          <h2 class="empty-title-elite">{{ $t('automation.emptyTitle') }}</h2>
          <p class="empty-desc-elite">{{ $t('automation.emptyDesc') }}</p>
          <button @click="openAddModal" class="btn-elite-solid primary mt-10">
            <i class="fa-solid fa-plus"></i> {{ $t('automation.createFirst') }}
          </button>
        </div>

        <!-- Rules Table -->
        <div v-else-if="!loading" class="rules-table">
          <div class="rules-header">
            <span class="col-toggle">{{ $t('common.active') }}</span>
            <span class="col-name">{{ $t('automation.name') }}</span>
            <span class="col-trigger">{{ $t('automation.trigger') }}</span>
            <span class="col-condition">{{ $t('automation.conditions') }}</span>
            <span class="col-action">{{ $t('automation.then') }}</span>
            <span class="col-actions"></span>
          </div>

          <div v-for="rule in rules" :key="rule.id" class="rule-row" :class="{ inactive: !rule.active }">
            <div class="col-toggle">
              <label class="premium-switch">
                <input type="checkbox" v-model="rule.active" @change="toggleRule(rule)">
                <span class="switch-slider"></span>
              </label>
            </div>

            <div class="col-name">
              <div class="rule-icon"><i class="fa-solid fa-bolt"></i></div>
              <span class="rule-name">{{ rule.name }}</span>
            </div>

            <div class="col-trigger">
              <span v-if="rule.triggers?.length" class="badge-trigger">
                <i class="fa-solid fa-play fa-xs"></i>
                {{ triggerLabel(rule.triggers[0].trigger_type) }}
              </span>
            </div>

            <div class="col-condition">
              <span v-if="rule.conditions?.length" class="badge-condition">
                <i class="fa-solid fa-filter fa-xs"></i>
                {{ rule.conditions[0].field }} {{ rule.conditions[0].operator.toLowerCase() }} {{ rule.conditions[0].value }}
              </span>
              <span v-else class="badge-no-condition">{{ $t('automation.no_condition') || 'Always' }}</span>
            </div>

            <div class="col-action">
              <span v-if="rule.actions?.length" class="badge-action">
                <i class="fa-solid fa-bolt fa-xs"></i>
                {{ actionLabel(rule.actions[0].action_type) }}
                <span v-if="rule.actions[0].parameters?.target" class="action-target">→ {{ rule.actions[0].parameters.target }}</span>
              </span>
            </div>

            <div class="col-actions">
              <button @click="openEditModal(rule)" class="btn-icon-edit" :title="$t('common.edit')">
                <i class="fa-solid fa-pen fa-xs"></i>
              </button>
              <button @click="deleteRule(rule.id)" class="btn-icon-danger" :title="$t('common.delete')">
                <i class="fa-solid fa-trash fa-xs"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Skeleton -->
        <div v-else class="rules-table skeleton">
          <div v-for="i in 4" :key="i" class="rule-row-skeleton"></div>
        </div>

      </div>
    </main>

    <!-- Edit Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showEditModal" class="elite-modal-backdrop" @click.self="showEditModal = false">
          <div class="elite-modal-window large glassmorphism animate-pop">
            <div class="modal-header-elite primary">
              <div class="modal-icon-orb"><i class="fa-solid fa-pen"></i></div>
              <h3>{{ $t('common.edit') }}</h3>
            </div>
            <div class="modal-body-elite scrollable custom-scrollbar">
              <div class="field-group">
                <label>{{ $t('automation.name') }} <span class="required">*</span></label>
                <div class="input-with-icon">
                  <i class="fa-solid fa-bolt"></i>
                  <input v-model="editRule.name" type="text" />
                </div>
              </div>
              <div class="steps-flow">
                <div class="step-card when">
                  <div class="step-num emerald">01</div>
                  <div class="step-title emerald"><i class="fa-solid fa-play-circle"></i> {{ $t('automation.when') }}</div>
                  <div class="step-body">
                    <label>{{ $t('automation.triggerType') }}</label>
                    <select v-model="editRule.trigger_type" class="step-select">
                      <option value="TASK_CREATED">🆕 {{ $t('automation.triggers.created') || 'Task Created' }}</option>
                      <option value="TASK_UPDATED">✏️ {{ $t('automation.triggers.updated') || 'Task Updated' }}</option>
                      <option value="STATUS_CHANGED">🔄 {{ $t('automation.triggers.status') || 'Status Changed' }}</option>
                      <option value="ASSIGNEE_CHANGED">👤 {{ $t('automation.triggers.assignee') || 'Assignee Changed' }}</option>
                    </select>
                  </div>
                  <div class="step-line emerald"></div>
                </div>
                <div class="step-card if">
                  <div class="step-num blue">02</div>
                  <div class="step-title blue"><i class="fa-solid fa-filter"></i> {{ $t('automation.if') }} <span class="optional">({{ $t('common.optional') || 'optional' }})</span></div>
                  <div class="step-body">
                    <label>{{ $t('automation.field') || 'Field' }}</label>
                    <select v-model="editRule.condition_field" class="step-select">
                      <option value="">— {{ $t('automation.no_condition') || 'No condition' }} —</option>
                      <option value="priority">priority</option>
                      <option value="issue_type">issue_type</option>
                      <option value="status.name">status.name</option>
                      <option value="status.category">status.category</option>
                      <option value="assigned_to.username">assigned_to.username</option>
                      <option value="story_points">story_points</option>
                    </select>
                    <template v-if="editRule.condition_field">
                      <label>{{ $t('automation.operator') }}</label>
                      <select v-model="editRule.condition_operator" class="step-select">
                        <option value="EQUALS">= Equals</option>
                        <option value="NOT_EQUALS">≠ Not Equals</option>
                        <option value="CONTAINS">⊃ Contains</option>
                        <option value="GREATER_THAN">&gt; Greater Than</option>
                        <option value="LESS_THAN">&lt; Less Than</option>
                      </select>
                      <label>{{ $t('common.value') }}</label>
                      <input v-model="editRule.condition_value" type="text" class="step-input" />
                    </template>
                  </div>
                  <div class="step-line blue"></div>
                </div>
                <div class="step-card then">
                  <div class="step-num purple">03</div>
                  <div class="step-title purple"><i class="fa-solid fa-bolt"></i> {{ $t('automation.then') }}</div>
                  <div class="step-body">
                    <label>{{ $t('automation.actionType') }}</label>
                    <select v-model="editRule.action_type" class="step-select">
                      <option value="SET_STATUS">🔄 {{ $t('automation.actions.status') || 'Set Status' }}</option>
                      <option value="ASSIGN_USER">👤 {{ $t('automation.actions.user') || 'Assign User' }}</option>
                      <option value="ADD_LABEL">🏷️ {{ $t('automation.actions.label') || 'Add Label' }}</option>
                      <option value="ADD_COMMENT">💬 {{ $t('automation.actions.comment') || 'Add Comment' }}</option>
                      <option value="SEND_NOTIFICATION">🔔 {{ $t('automation.actions.notification') || 'Send Notification' }}</option>
                    </select>
                    <label>{{ $t('automation.target') || 'Target' }}</label>
                    <select v-if="editRule.action_type === 'SET_STATUS'" v-model="editRule.action_param_str" class="step-select">
                      <option v-for="s in projectStatuses" :key="s.id" :value="s.name">{{ s.name }}</option>
                    </select>
                    <select v-else-if="editRule.action_type === 'ASSIGN_USER' || editRule.action_type === 'SEND_NOTIFICATION'" v-model="editRule.action_param_str" class="step-select">
                      <option v-for="m in projectMembers" :key="m.id" :value="m.username">{{ m.username }}</option>
                    </select>
                    <select v-else-if="editRule.action_type === 'ADD_LABEL'" v-model="editRule.action_param_str" class="step-select">
                      <option v-for="l in projectLabels" :key="l.id" :value="l.name">{{ l.name }}</option>
                    </select>
                    <textarea v-else-if="editRule.action_type === 'ADD_COMMENT'" v-model="editRule.action_param_str" class="step-textarea" rows="3"></textarea>
                    <input v-else v-model="editRule.action_param_str" type="text" class="step-input" />
                  </div>
                  <div class="step-line purple"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer-elite">
              <button @click="showEditModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="updateRule" class="btn-elite-solid primary" :disabled="loadingSave || !editRule.name">
                <span v-if="loadingSave" class="spinner-tiny"></span>
                <i v-else class="fa-solid fa-check"></i>
                {{ loadingSave ? '...' : $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Modal -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="showAddModal" class="elite-modal-backdrop" @click.self="showAddModal = false">
          <div class="elite-modal-window large glassmorphism animate-pop">

            <div class="modal-header-elite primary">
              <div class="modal-icon-orb"><i class="fa-solid fa-bolt"></i></div>
              <h3>{{ $t('automation.newRule') }}</h3>
            </div>

            <div class="modal-body-elite scrollable custom-scrollbar">

              <!-- Rule Name -->
              <div class="field-group">
                <label>{{ $t('automation.name') }} <span class="required">*</span></label>
                <div class="input-with-icon">
                  <i class="fa-solid fa-bolt"></i>
                  <input v-model="newRule.name" type="text" :placeholder="$t('automation.name_placeholder') || 'e.g. Auto-assign HIGH bugs'" />
                </div>
              </div>

              <!-- 3-Step Flow -->
              <div class="steps-flow">

                <!-- STEP 01: WHEN -->
                <div class="step-card when">
                  <div class="step-num emerald">01</div>
                  <div class="step-title emerald"><i class="fa-solid fa-play-circle"></i> {{ $t('automation.when') }}</div>
                  <div class="step-body">
                    <label>{{ $t('automation.triggerType') }}</label>
                    <select v-model="newRule.trigger_type" class="step-select">
                      <option value="TASK_CREATED">🆕 {{ $t('automation.triggers.created') || 'Task Created' }}</option>
                      <option value="TASK_UPDATED">✏️ {{ $t('automation.triggers.updated') || 'Task Updated' }}</option>
                      <option value="STATUS_CHANGED">🔄 {{ $t('automation.triggers.status') || 'Status Changed' }}</option>
                      <option value="ASSIGNEE_CHANGED">👤 {{ $t('automation.triggers.assignee') || 'Assignee Changed' }}</option>
                    </select>
                  </div>
                  <div class="step-line emerald"></div>
                </div>

                <!-- STEP 02: IF -->
                <div class="step-card if">
                  <div class="step-num blue">02</div>
                  <div class="step-title blue"><i class="fa-solid fa-filter"></i> {{ $t('automation.if') }} <span class="optional">({{ $t('common.optional') || 'optional' }})</span></div>
                  <div class="step-body">
                    <label>{{ $t('automation.field') || 'Field' }}</label>
                    <select v-model="newRule.condition_field" class="step-select">
                      <option value="">— {{ $t('automation.no_condition') || 'No condition (always run)' }} —</option>
                      <option value="priority">priority</option>
                      <option value="issue_type">issue_type</option>
                      <option value="status.name">status.name</option>
                      <option value="status.category">status.category</option>
                      <option value="assigned_to.username">assigned_to.username</option>
                      <option value="story_points">story_points</option>
                    </select>

                    <template v-if="newRule.condition_field">
                      <label>{{ $t('automation.operator') }}</label>
                      <select v-model="newRule.condition_operator" class="step-select">
                        <option value="EQUALS">= Equals</option>
                        <option value="NOT_EQUALS">≠ Not Equals</option>
                        <option value="CONTAINS">⊃ Contains</option>
                        <option value="GREATER_THAN">&gt; Greater Than</option>
                        <option value="LESS_THAN">&lt; Less Than</option>
                      </select>

                      <label>{{ $t('common.value') }}</label>
                      <!-- Dynamic value hints based on field -->
                      <select v-if="newRule.condition_field === 'priority'" v-model="newRule.condition_value" class="step-select">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                      <select v-else-if="newRule.condition_field === 'issue_type'" v-model="newRule.condition_value" class="step-select">
                        <option value="TASK">TASK</option>
                        <option value="BUG">BUG</option>
                        <option value="STORY">STORY</option>
                      </select>
                      <select v-else-if="newRule.condition_field === 'status.category'" v-model="newRule.condition_value" class="step-select">
                        <option value="TO_DO">TO_DO</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="DONE">DONE</option>
                      </select>
                      <input v-else v-model="newRule.condition_value" type="text" class="step-input" :placeholder="conditionValuePlaceholder" />
                    </template>
                  </div>
                  <div class="step-line blue"></div>
                </div>

                <!-- STEP 03: THEN -->
                <div class="step-card then">
                  <div class="step-num purple">03</div>
                  <div class="step-title purple"><i class="fa-solid fa-bolt"></i> {{ $t('automation.then') }}</div>
                  <div class="step-body">
                    <label>{{ $t('automation.actionType') }}</label>
                    <select v-model="newRule.action_type" class="step-select">
                      <option value="SET_STATUS">🔄 {{ $t('automation.actions.status') || 'Set Status' }}</option>
                      <option value="ASSIGN_USER">👤 {{ $t('automation.actions.user') || 'Assign User' }}</option>
                      <option value="ADD_LABEL">🏷️ {{ $t('automation.actions.label') || 'Add Label' }}</option>
                      <option value="ADD_COMMENT">💬 {{ $t('automation.actions.comment') || 'Add Comment' }}</option>
                      <option value="SEND_NOTIFICATION">🔔 {{ $t('automation.actions.notification') || 'Send Notification' }}</option>
                    </select>

                    <!-- Dynamic target field -->
                    <label>{{ actionTargetLabel }}</label>

                    <!-- Status: dropdown from project statuses -->
                    <select v-if="newRule.action_type === 'SET_STATUS'" v-model="newRule.action_param_str" class="step-select">
                      <option v-for="s in projectStatuses" :key="s.id" :value="s.name">{{ s.name }}</option>
                    </select>

                    <!-- User: dropdown from project members -->
                    <select v-else-if="newRule.action_type === 'ASSIGN_USER' || newRule.action_type === 'SEND_NOTIFICATION'" v-model="newRule.action_param_str" class="step-select">
                      <option v-for="m in projectMembers" :key="m.id" :value="m.username">{{ m.username }}</option>
                    </select>

                    <!-- Label: dropdown from project labels -->
                    <select v-else-if="newRule.action_type === 'ADD_LABEL'" v-model="newRule.action_param_str" class="step-select">
                      <option v-for="l in projectLabels" :key="l.id" :value="l.name">{{ l.name }}</option>
                    </select>

                    <!-- Comment: free text -->
                    <textarea v-else-if="newRule.action_type === 'ADD_COMMENT'" v-model="newRule.action_param_str" class="step-textarea" rows="3" :placeholder="$t('automation.comment_placeholder') || 'Comment text...'"></textarea>

                    <input v-else v-model="newRule.action_param_str" type="text" class="step-input" :placeholder="actionTargetPlaceholder" />
                  </div>
                  <div class="step-line purple"></div>
                </div>

              </div>
            </div>

            <div class="modal-footer-elite">
              <button @click="showAddModal = false" class="btn-elite-glass">{{ $t('common.cancel') }}</button>
              <button @click="saveRule" class="btn-elite-solid primary" :disabled="loadingSave || !newRule.name">
                <span v-if="loadingSave" class="spinner-tiny"></span>
                <i v-else class="fa-solid fa-bolt"></i>
                {{ loadingSave ? '...' : $t('automation.activate') }}
              </button>
            </div>

          </div>
        </div>
      </transition>
    </Teleport>

  </div>
</template>

<script>
import axios from '@/plugins/axios';
import AnimatedIcon from '@/components/AnimatedIcon.vue';
import { usePermissions } from '@/composables/usePermissions';

export default {
  name: 'AutomationRulesView',
  props: ['projectId'],
  components: { AnimatedIcon },
  data() {
    const perms = usePermissions();
    return {
      projectDetails: null,
      rules: [],
      loading: true,
      loadingSave: false,
      showAddModal: false,
      showEditModal: false,
      editRule: {},
      projectStatuses: [],
      projectMembers: [],
      projectLabels: [],
      newRule: this.emptyRule(),
      canManageSettings: perms.canViewSettings.value || perms.isSuperuser.value,
    };
  },
  computed: {
    conditionValuePlaceholder() {
      const map = {
        'status.name': 'e.g. In Review',
        'assigned_to.username': 'e.g. john',
        'story_points': 'e.g. 5',
      };
      return map[this.newRule.condition_field] || 'value';
    },
    actionTargetLabel() {
      const map = {
        SET_STATUS: this.$t('automation.target_status') || 'Status Name',
        ASSIGN_USER: this.$t('automation.target_user') || 'Username',
        ADD_LABEL: this.$t('automation.target_label') || 'Label Name',
        ADD_COMMENT: this.$t('automation.target_comment') || 'Comment Text',
        SEND_NOTIFICATION: this.$t('automation.target_notify') || 'Notify User',
      };
      return map[this.newRule.action_type] || this.$t('automation.target');
    },
    actionTargetPlaceholder() {
      const map = {
        SET_STATUS: 'Done',
        ASSIGN_USER: 'username',
        ADD_LABEL: 'bug',
        ADD_COMMENT: 'This task was auto-processed.',
        SEND_NOTIFICATION: 'username',
      };
      return map[this.newRule.action_type] || '';
    },
  },
  mounted() {
    this.fetchProject();
    this.fetchRules();
    this.fetchStatuses();
    this.fetchMembers();
    this.fetchLabels();
  },
  methods: {
    emptyRule() {
      return {
        name: '',
        trigger_type: 'TASK_CREATED',
        condition_field: '',
        condition_operator: 'EQUALS',
        condition_value: '',
        action_type: 'SET_STATUS',
        action_param_str: '',
      };
    },
    triggerLabel(type) {
      const map = {
        TASK_CREATED: '🆕 Task Created',
        TASK_UPDATED: '✏️ Task Updated',
        STATUS_CHANGED: '🔄 Status Changed',
        ASSIGNEE_CHANGED: '👤 Assignee Changed',
      };
      return map[type] || type;
    },
    actionLabel(type) {
      const map = {
        SET_STATUS: '🔄 Set Status',
        ASSIGN_USER: '👤 Assign User',
        ADD_LABEL: '🏷️ Add Label',
        ADD_COMMENT: '💬 Add Comment',
        SEND_NOTIFICATION: '🔔 Notify',
      };
      return map[type] || type;
    },
    async fetchProject() {
      try {
        const res = await axios.get(`/api/pm/projects/${this.projectId}/`);
        this.projectDetails = res.data;
      } catch (e) { console.error(e); }
    },
    async fetchRules() {
      this.loading = true;
      try {
        const res = await axios.get(`/api/pm/automation-rules/?project=${this.projectId}`);
        this.rules = res.data;
      } catch (e) { console.error(e); } finally { this.loading = false; }
    },
    async fetchStatuses() {
      try {
        const res = await axios.get(`/api/pm/statuses/?project=${this.projectId}`);
        this.projectStatuses = res.data;
      } catch (e) { console.error(e); }
    },
    async fetchMembers() {
      try {
        const res = await axios.get(`/api/pm/project-roles/?project=${this.projectId}`);
        this.projectMembers = res.data.map(r => ({ id: r.user, username: r.username }));
      } catch (e) { console.error(e); }
    },
    async fetchLabels() {
      try {
        const res = await axios.get(`/api/pm/labels/?project=${this.projectId}`);
        this.projectLabels = res.data;
      } catch (e) { console.error(e); }
    },
    openAddModal() {
      this.newRule = this.emptyRule();
      this.showAddModal = true;
    },
    async toggleRule(rule) {
      try {
        await axios.patch(`/api/pm/automation-rules/${rule.id}/`, { active: rule.active });
      } catch (e) { console.error(e); }
    },
    async deleteRule(id) {
      if (confirm(this.$t('automation.delete_confirm') || 'Delete this rule?')) {
        await axios.delete(`/api/pm/automation-rules/${id}/`);
        this.fetchRules();
      }
    },
    openEditModal(rule) {
      this.editRule = {
        id: rule.id,
        name: rule.name,
        trigger_type: rule.triggers?.[0]?.trigger_type || 'TASK_CREATED',
        trigger_id: rule.triggers?.[0]?.id || null,
        condition_id: rule.conditions?.[0]?.id || null,
        condition_field: rule.conditions?.[0]?.field || '',
        condition_operator: rule.conditions?.[0]?.operator || 'EQUALS',
        condition_value: rule.conditions?.[0]?.value || '',
        action_id: rule.actions?.[0]?.id || null,
        action_type: rule.actions?.[0]?.action_type || 'SET_STATUS',
        action_param_str: rule.actions?.[0]?.parameters?.target || rule.actions?.[0]?.parameters?.comment || '',
      };
      this.showEditModal = true;
    },
    async updateRule() {
      if (!this.editRule.name) return;
      this.loadingSave = true;
      try {
        await axios.patch(`/api/pm/automation-rules/${this.editRule.id}/`, { name: this.editRule.name });

        if (this.editRule.trigger_id) {
          await axios.patch(`/api/pm/automation-triggers/${this.editRule.trigger_id}/`, { trigger_type: this.editRule.trigger_type });
        }

        if (this.editRule.condition_field && this.editRule.condition_value) {
          const condPayload = { field: this.editRule.condition_field, operator: this.editRule.condition_operator, value: this.editRule.condition_value };
          if (this.editRule.condition_id) {
            await axios.patch(`/api/pm/automation-conditions/${this.editRule.condition_id}/`, condPayload);
          } else {
            await axios.post('/api/pm/automation-conditions/', { rule: this.editRule.id, ...condPayload });
          }
        }

        if (this.editRule.action_id) {
          const params = this.editRule.action_type === 'ADD_COMMENT'
            ? { comment: this.editRule.action_param_str }
            : { target: this.editRule.action_param_str };
          await axios.patch(`/api/pm/automation-actions/${this.editRule.action_id}/`, { action_type: this.editRule.action_type, parameters: params });
        }

        this.showEditModal = false;
        this.fetchRules();
      } catch (e) {
        console.error(e);
      } finally {
        this.loadingSave = false;
      }
    },
    async saveRule() {
      if (!this.newRule.name || !this.newRule.action_param_str) return;
      this.loadingSave = true;
      try {
        const ruleRes = await axios.post('/api/pm/automation-rules/', {
          project: this.projectId,
          name: this.newRule.name,
          active: true,
        });
        const rule = ruleRes.data;

        await axios.post('/api/pm/automation-triggers/', {
          rule: rule.id,
          trigger_type: this.newRule.trigger_type,
        });

        if (this.newRule.condition_field && this.newRule.condition_value) {
          await axios.post('/api/pm/automation-conditions/', {
            rule: rule.id,
            field: this.newRule.condition_field,
            operator: this.newRule.condition_operator,
            value: this.newRule.condition_value,
          });
        }

        const params = this.newRule.action_type === 'ADD_COMMENT'
          ? { comment: this.newRule.action_param_str }
          : { target: this.newRule.action_param_str };

        await axios.post('/api/pm/automation-actions/', {
          rule: rule.id,
          action_type: this.newRule.action_type,
          parameters: params,
        });

        this.showAddModal = false;
        this.fetchRules();
      } catch (e) {
        console.error(e);
      } finally {
        this.loadingSave = false;
      }
    },
  },
};
</script>

<style scoped>
.automation-universe { display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; background: var(--bg-body); color: var(--text-main); font-family: var(--font-family); }

/* Top Bar */
.floating-top-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 40px; height: 72px; border-bottom: 1px solid var(--border-color); background: var(--bg-card); backdrop-filter: blur(20px); z-index: 50; flex-shrink: 0; }
.bar-left { display: flex; align-items: center; gap: 16px; }
.btn-back-orb { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border-color); background: var(--bg-hover); color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
.btn-back-orb:hover { border-color: var(--primary); color: var(--primary); }
.elite-breadcrumbs { display: flex; align-items: center; gap: 10px; }
.crumb { font-size: .85rem; font-weight: 700; color: var(--text-muted); cursor: pointer; transition: .2s; }
.crumb:hover { color: var(--primary); }
.crumb.active { color: var(--text-main); }
.sep { opacity: .25; font-size: .65rem; }
.btn-main-orb { display: flex; align-items: center; gap: 8px; padding: 8px 18px; border-radius: 20px; border: none; background: var(--primary); color: #fff; font-weight: 700; font-size: .85rem; font-family: var(--font-family); cursor: pointer; transition: .2s; box-shadow: 0 4px 14px var(--primary-glow); }
.btn-main-orb:hover { transform: translateY(-1px); box-shadow: 0 6px 20px var(--primary-glow); filter: brightness(1.08); }

/* Main */
.main-stage { flex: 1; overflow-y: auto; }
.content-padding { padding: 32px 40px;  margin: 0 auto; }

/* Empty State */
.premium-empty-state { display: flex; flex-direction: column; align-items: center; padding: 100px 40px; text-align: center; }
.pulsing-orb-container { position: relative; width: 120px; height: 120px; display: flex; align-items: center; justify-content: center; margin-bottom: 32px; }
.orb-pulse { position: absolute; inset: -16px; border-radius: 50%; opacity: .2; animation: orbPulse 3s ease-in-out infinite; }
.orb-pulse.emerald { background: radial-gradient(circle, var(--primary), transparent 70%); }
.orb-core { width: 80px; height: 80px; border-radius: 24px; display: flex; align-items: center; justify-content: center; color: #fff; transform: rotate(45deg); }
.orb-core.emerald { background: var(--primary); box-shadow: 0 16px 32px var(--primary-glow); }
.orb-core i { transform: rotate(-45deg); }
@keyframes orbPulse { 0%,100% { transform: scale(.8); opacity: 0; } 50% { transform: scale(1.6); opacity: .3; } }
.empty-title-elite { font-size: 2.5rem; font-weight: 900; color: var(--text-main); margin-bottom: 12px; }
.empty-desc-elite { font-size: 1.1rem; color: var(--text-muted); max-width: 480px; line-height: 1.7; }
.mt-10 { margin-top: 24px; }

/* Rules Table */
.rules-table { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 16px; overflow: hidden; }
.rules-header, .rule-row { display: grid; grid-template-columns: 70px 1.8fr 1.2fr 1.8fr 1.5fr 80px; align-items: center; padding: 0 20px; }
.rules-header { padding: 14px 20px; background: var(--bg-hover); font-size: .72rem; font-weight: 800; text-transform: uppercase; letter-spacing: .1em; color: var(--text-muted); border-bottom: 1px solid var(--border-color); }
.rule-row { padding: 16px 20px; border-bottom: 1px solid var(--border-color); transition: background .15s; gap: 8px; }
.rule-row:last-child { border-bottom: none; }
.rule-row:hover { background: var(--bg-hover); }
.rule-row.inactive { opacity: .5; }
.rule-icon { width: 28px; height: 28px; border-radius: 8px; background: var(--primary-bg); color: var(--primary); display: flex; align-items: center; justify-content: center; font-size: .75rem; flex-shrink: 0; }
.col-name { display: flex; align-items: center; gap: 10px; }
.rule-name { font-weight: 600; font-size: .9rem; color: var(--text-main); }
.badge-trigger { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; font-weight: 700; color: var(--primary); background: var(--primary-bg); padding: 4px 10px; border-radius: 20px; }
.badge-condition { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; font-weight: 600; color: var(--text-main); background: var(--bg-hover); border: 1px solid var(--border-color); padding: 4px 10px; border-radius: 20px; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.badge-no-condition { font-size: .72rem; color: var(--text-muted); font-style: italic; }
.badge-action { display: inline-flex; align-items: center; gap: 6px; font-size: .72rem; font-weight: 700; color: var(--primary); background: var(--primary-bg); padding: 4px 10px; border-radius: 20px; opacity: .85; }
.action-target { color: var(--text-muted); font-weight: 400; }
.btn-icon-danger { width: 30px; height: 30px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
.btn-icon-danger:hover { background: rgba(239,68,68,.1); color: #ef4444; border-color: rgba(239,68,68,.2); }
.btn-icon-edit { width: 30px; height: 30px; border-radius: 8px; border: 1px solid transparent; background: none; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: .2s; }
.btn-icon-edit:hover { background: var(--primary-bg); color: var(--primary); border-color: var(--primary-glow); }
.col-actions { display: flex; align-items: center; gap: 4px; }
.rule-row-skeleton { height: 56px; background: var(--bg-hover); margin: 1px 0; animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: .4; } }

/* Switch */
.premium-switch { position: relative; display: inline-block; width: 40px; height: 22px; }
.premium-switch input { opacity: 0; width: 0; height: 0; }
.switch-slider { position: absolute; inset: 0; background: var(--bg-hover); border-radius: 22px; cursor: pointer; transition: .3s; border: 1px solid var(--border-color); }
.switch-slider::before { content: ''; position: absolute; width: 16px; height: 16px; left: 2px; top: 2px; background: #fff; border-radius: 50%; transition: .3s; }
.premium-switch input:checked + .switch-slider { background: var(--primary); border-color: var(--primary); box-shadow: 0 0 8px var(--primary-glow); }
.premium-switch input:checked + .switch-slider::before { transform: translateX(18px); }

/* Modal */
.elite-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.6); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.elite-modal-window { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 24px; width: 100%; max-width: 900px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; }
.modal-header-elite { display: flex; align-items: center; gap: 14px; padding: 24px 28px; border-bottom: 1px solid var(--border-color); }
.modal-header-elite.primary { background: linear-gradient(135deg, var(--primary-bg), transparent); }
.modal-icon-orb { width: 40px; height: 40px; border-radius: 12px; background: var(--primary); display: flex; align-items: center; justify-content: center; color: #fff; }
.modal-header-elite h3 { font-size: 1.2rem; font-weight: 800; color: var(--text-main); }
.modal-body-elite { flex: 1; overflow-y: auto; padding: 28px; display: flex; flex-direction: column; gap: 24px; }
.modal-footer-elite { display: flex; align-items: center; justify-content: flex-end; gap: 12px; padding: 20px 28px; border-top: 1px solid var(--border-color); }

/* Field Group */
.field-group { display: flex; flex-direction: column; gap: 8px; }
.field-group label { font-size: .8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
.required { color: var(--primary); }
.input-with-icon { position: relative; }
.input-with-icon i { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: .85rem; }
.input-with-icon input { width: 100%; padding: 10px 14px 10px 38px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-main); font-size: .95rem; box-sizing: border-box; font-family: var(--font-family); }
.input-with-icon input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-bg); }

/* Steps Flow */
.steps-flow { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
@media (max-width: 700px) { .steps-flow { grid-template-columns: 1fr; } }
.step-card { background: var(--bg-hover); border: 1px solid var(--border-color); border-radius: 20px; display: flex; flex-direction: column; overflow: hidden; position: relative; }
.step-num { position: absolute; top: -1px; right: 20px; width: 36px; height: 36px; border-radius: 0 0 12px 12px; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 1rem; color: #fff; }
.step-num.emerald { background: #10b981; }
.step-num.blue { background: #3b82f6; }
.step-num.purple { background: #a855f7; }
.step-title { padding: 20px 20px 0; font-size: .72rem; font-weight: 900; text-transform: uppercase; letter-spacing: .2em; display: flex; align-items: center; gap: 8px; }
.step-title.emerald { color: #10b981; }
.step-title.blue { color: #3b82f6; }
.step-title.purple { color: #a855f7; }
.optional { font-weight: 400; text-transform: none; letter-spacing: 0; color: var(--text-muted); font-size: .7rem; }
.step-body { padding: 14px 20px 20px; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.step-body label { font-size: .75rem; font-weight: 700; color: var(--text-muted); }
.step-select, .step-input, .step-textarea { width: 100%; padding: 9px 12px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; color: var(--text-main); font-size: .88rem; box-sizing: border-box; appearance: auto; }
.step-select:focus, .step-input:focus, .step-textarea:focus { outline: none; border-color: var(--primary); }
.step-select option { background: var(--bg-card); color: var(--text-main); }
.step-textarea { resize: vertical; font-family: inherit; }
.step-line { height: 3px; width: 100%; margin-top: auto; }
.step-line.emerald { background: linear-gradient(to right, #10b981, transparent); }
.step-line.blue { background: linear-gradient(to right, #3b82f6, transparent); }
.step-line.purple { background: linear-gradient(to right, #a855f7, transparent); }

/* Buttons */
.btn-elite-glass { padding: 10px 22px; border-radius: 10px; border: 1px solid var(--border-color); background: transparent; color: var(--text-main); font-weight: 600; cursor: pointer; transition: .2s; }
.btn-elite-glass:hover { background: var(--bg-hover); color: var(--text-main); border-color: var(--border-color); }
.btn-elite-solid { display: flex; align-items: center; gap: 8px; padding: 10px 22px; border-radius: 10px; border: none; font-weight: 700; cursor: pointer; transition: .2s; }
.btn-elite-solid.primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; }
.btn-elite-solid.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99,102,241,.3); }
.btn-elite-solid:disabled { opacity: .5; cursor: not-allowed; }
.btn-elite-solid.primary { background: linear-gradient(135deg, #6366f1, #4f46e5); color: #fff; }
.spinner-tiny { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Animations */
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity .2s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.animate-pop { animation: pop .25s cubic-bezier(.34,1.56,.64,1); }
@keyframes pop { from { transform: scale(.92); opacity: 0; } to { transform: scale(1); opacity: 1; } }
.glassmorphism { backdrop-filter: blur(20px); }
</style>
