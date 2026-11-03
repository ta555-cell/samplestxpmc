let currentUser = null;
        let currentRole = 'User';
        let currentBranch = 'Main Branch';
        let activeStorageType = 'C';
        let activeRackId = localStorage.getItem('ssx_active_rack_id') || null;

        let gridConfig = { colWidth: 65, rowHeight: 42, fontSizePx: 12, showEmptyPos: 'yes' };
        let rackDateFormatPrefix = 'DD-MM-YY';
        let pendingStickerRackId = null;

        let firebaseConfigData = window.CLIENT_FIREBASE_CONFIG;

        let defaultBranches = ['Main Branch', 'North Lab', 'South Lab'];
        let defaultRoles = [
            { name: 'Super Admin', permissions: ['users', 'roles', 'labBranch', 'deptColors', 'manageRacks', 'discardAlerts', 'hostingConfig', 'printer', 'gridDisplay', 'dataBackup', 'deleteData', 'feat_startRack', 'feat_addSample', 'feat_pdfSheet', 'feat_sticker', 'feat_endStorage', 'feat_discardRack'] },
            { name: 'Admin', permissions: ['users', 'labBranch', 'deptColors', 'printer', 'gridDisplay', 'dataBackup', 'feat_startRack', 'feat_addSample', 'feat_pdfSheet', 'feat_sticker', 'feat_endStorage'] },
            { name: 'User', permissions: ['feat_addSample', 'feat_pdfSheet', 'feat_sticker'] }
        ];
        let defaultUsers = [
            { username: 'superAdmin', password: '123', role: 'Super Admin', branches: ['Main Branch', 'North Lab', 'South Lab'] },
            { username: 'Admin', password: '123', role: 'Admin', branches: ['Main Branch'] },
            { username: 'User', password: '123', role: 'User', branches: ['Main Branch'] }
        ];
        let defaultDepts = [
            { id: 'C', name: 'Chemistry', capacity: 100, color: '#3b82f6', defaultDays: 7, minHours: 0, alertDays: 2 },
            { id: 'H', name: 'Hematology', capacity: 100, color: '#800080', defaultDays: 5, minHours: 0, alertDays: 1 }
        ];

        if (!localStorage.getItem('ssx_branches_list')) localStorage.setItem('ssx_branches_list', JSON.stringify(defaultBranches));
        if (!localStorage.getItem('ssx_roles_list')) localStorage.setItem('ssx_roles_list', JSON.stringify(defaultRoles));
        if (!localStorage.getItem('ssx_users_list')) localStorage.setItem('ssx_users_list', JSON.stringify(defaultUsers));
        if (!localStorage.getItem('ssx_departments')) localStorage.setItem('ssx_departments', JSON.stringify(defaultDepts));
        if (!localStorage.getItem('ssx_hosting_mode')) localStorage.setItem('ssx_hosting_mode', 'LIVE');

        let branchesList = JSON.parse(localStorage.getItem('ssx_branches_list'));
        let rolesList = JSON.parse(localStorage.getItem('ssx_roles_list'));
        let usersList = JSON.parse(localStorage.getItem('ssx_users_list'));
        let departments = JSON.parse(localStorage.getItem('ssx_departments'));

        window.refreshAllUIViews = function() {
            if (typeof refreshActiveRackDropdowns === 'function') refreshActiveRackDropdowns();
            if (typeof renderLiveRackGrid === 'function') renderLiveRackGrid();
            if (typeof renderSampleList === 'function') renderSampleList();
            if (typeof renderRackList === 'function') renderRackList();
            if (typeof renderDiscardedRacksList === 'function') renderDiscardedRacksList();
            if (typeof loadHeaderLabInfo === 'function') loadHeaderLabInfo();
        };

        function showCustomAlert(title, message) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalBody').innerHTML = message;
            document.getElementById('modalFooter').innerHTML = `<button onclick="closeModal()" class="bg-blue-600 text-white px-4 py-1.5 rounded text-xs font-semibold">OK</button>`;
            document.getElementById('customModal').classList.remove('hidden');
        }

        function showCustomConfirm(title, message, onYes) {
            document.getElementById('modalTitle').innerText = title;
            document.getElementById('modalBody').innerHTML = message;
            document.getElementById('modalFooter').innerHTML = `
                <button onclick="closeModal()" class="bg-slate-800 text-slate-300 px-3 py-1.5 rounded text-xs font-semibold">Cancel</button>
                <button id="modalConfirmYesBtn" class="bg-emerald-600 text-white px-4 py-1.5 rounded text-xs font-semibold">Confirm</button>
            `;
            document.getElementById('customModal').classList.remove('hidden');
            document.getElementById('modalConfirmYesBtn').onclick = () => { closeModal(); if(onYes) onYes(); };
        }

        function closeModal() { document.getElementById('customModal').classList.add('hidden'); }
        function toggleSectionCollapse(id) { document.getElementById(id).classList.toggle('hidden'); }

        function togglePasswordVisibility(inputId, btnEl) {
            const input = document.getElementById(inputId);
            if (!input) return;
            if (input.type === 'password') {
                input.type = 'text';
                btnEl.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
            } else {
                input.type = 'password';
                btnEl.innerHTML = '<i class="fa-solid fa-eye"></i>';
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            loadBranchesDropdown();
            initDeptDropdowns();
            checkSessionPersistence();
            populateHostingUIState();
            checkAutoDeleteDiscardedRacks();
        });

        function loadHeaderLabInfo() {
            const lName = localStorage.getItem(`ssx_lab_name_${currentBranch}`) || `${currentBranch} Laboratory`;
            const lContact = localStorage.getItem(`ssx_lab_contact_${currentBranch}`) || '+92 300 1234567';
            const lAddr = localStorage.getItem(`ssx_lab_address_${currentBranch}`) || 'Diagnostic Tower';

            document.getElementById('headerLabName').innerText = lName;
            document.getElementById('headerLabContact').innerText = `Contact: ${lContact} | Address: ${lAddr}`;
        }

        function loadBranchesDropdown() {
            const infoBSel = document.getElementById('labInfoBranchSelect');
            const rSel = document.getElementById('newUserRole');
            const bkSel = document.getElementById('backupBranchSelect');
            const clSel = document.getElementById('cleanupBranchSelect');

            if (infoBSel) infoBSel.innerHTML = '';
            if (bkSel) bkSel.innerHTML = '';
            if (clSel) clSel.innerHTML = '';
            if (rSel) rSel.innerHTML = '';

            branchesList.forEach(b => {
                const opt = document.createElement('option');
                opt.value = b;
                opt.innerText = b;
                if (infoBSel) infoBSel.appendChild(opt.cloneNode(true));
                if (bkSel) bkSel.appendChild(opt.cloneNode(true));
                if (clSel) clSel.appendChild(opt.cloneNode(true));
            });

            rolesList.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.name;
                opt.innerText = r.name;
                if (rSel) rSel.appendChild(opt);
            });
        }

        function handleLogin(e) {
            e.preventDefault();
            const u = document.getElementById('loginUser').value.trim();
            const p = document.getElementById('loginPass').value;

            let currentUsers = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;
            let foundU = currentUsers.find(x => x.username.toLowerCase() === u.toLowerCase());
            
            if (!foundU) {
                showCustomAlert('Login Error', 'Wrong Username!');
                return;
            }

            if (foundU.password && foundU.password !== p) {
                showCustomAlert('Login Error', 'Wrong Password!');
                return;
            }

            currentUser = foundU.username;
            currentRole = foundU.role;
            
            let userBranches = foundU.branches && foundU.branches.length > 0 ? foundU.branches : branchesList;
            currentBranch = userBranches[0] || 'Main Branch';

            localStorage.setItem('ssx_user', JSON.stringify({ user: currentUser, role: currentRole, branch: currentBranch }));
            initDashboardAfterLogin();
        }

        function checkSessionPersistence() {
            const saved = localStorage.getItem('ssx_user');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    currentUser = data.user;
                    currentRole = data.role;
                    currentBranch = data.branch || 'Main Branch';
                    initDashboardAfterLogin();
                } catch(e) {}
            }
        }

        function handleLogout() {
            localStorage.removeItem('ssx_user');
            currentUser = null;
            document.getElementById('dashboardApp').classList.add('hidden');
            document.getElementById('loginScreen').classList.remove('hidden');
        }

        function initDashboardAfterLogin() {
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('dashboardApp').classList.remove('hidden');
            document.getElementById('loggedUserDisplay').innerText = `${currentUser} (${currentRole})`;
            document.getElementById('headerBranchBadge').innerText = currentBranch;

            let currentUsers = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;
            let foundU = currentUsers.find(x => x.username.toLowerCase() === currentUser.toLowerCase());
            let userBranches = foundU && foundU.branches && foundU.branches.length > 0 ? foundU.branches : branchesList;
            if (!userBranches.includes(currentBranch)) {
                currentBranch = userBranches[0] || 'Main Branch';
            }

            const branchSel = document.getElementById('userBranchSelector');
            if (branchSel) {
                branchSel.innerHTML = '';
                userBranches.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b;
                    opt.innerText = b;
                    if (b === currentBranch) opt.selected = true;
                    branchSel.appendChild(opt);
                });
            }

            loadHeaderLabInfo();
            applyRolePermissionsUI();
            initDeptDropdowns();
            refreshAllUIViews();
        }

        function switchBranchFromHeader(newBranch) {
            currentBranch = newBranch;
            let saved = JSON.parse(localStorage.getItem('ssx_user') || '{}');
            saved.branch = currentBranch;
            localStorage.setItem('ssx_user', JSON.stringify(saved));
            
            document.getElementById('headerBranchBadge').innerText = currentBranch;
            loadHeaderLabInfo();
            refreshAllUIViews();
        }

        function applyRolePermissionsUI() {
            rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;
            let roleObj = rolesList.find(r => r.name === currentRole) || { permissions: [] };
            let perms = roleObj.permissions || [];

            const adminTabs = ['users', 'roles', 'labBranch', 'deptColors', 'manageRacks', 'discardAlerts', 'hostingConfig', 'printer', 'gridDisplay', 'dataBackup', 'deleteData'];
            
            let hasAnyAdminPerm = adminTabs.some(t => perms.includes(t)) || currentRole === 'Super Admin' || currentRole === 'Admin';
            const adminBtn = document.getElementById('adminPanelBtn');
            if (adminBtn) {
                if (hasAnyAdminPerm) adminBtn.classList.remove('hidden');
                else adminBtn.classList.add('hidden');
            }

            adminTabs.forEach(t => {
                const navBtn = document.getElementById(`adm_nav_${t}`);
                if (navBtn) {
                    if (perms.includes(t) || currentRole === 'Super Admin' || currentRole === 'Admin') {
                        navBtn.classList.remove('hidden');
                    } else {
                        navBtn.classList.add('hidden');
                    }
                }
            });
        }

        function checkAdminAccessAndToggle() {
            rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;
            let roleObj = rolesList.find(r => r.name === currentRole) || { permissions: [] };
            let perms = roleObj.permissions || [];
            let adminTabs = ['users', 'roles', 'labBranch', 'deptColors', 'manageRacks', 'discardAlerts', 'hostingConfig', 'printer', 'gridDisplay', 'dataBackup', 'deleteData'];
            let hasPerms = adminTabs.some(t => perms.includes(t)) || currentRole === 'Super Admin' || currentRole === 'Admin';

            if (!hasPerms) {
                showCustomAlert('Access Denied', 'You do not have permission to access the Admin Panel.');
                return;
            }

            let passStore = JSON.parse(localStorage.getItem('ssx_admin_passwords') || '{}');
            let branchPass = passStore[currentBranch];
            if (branchPass && currentRole !== 'Super Admin') {
                document.getElementById('adminModalBranchName').innerText = currentBranch;
                document.getElementById('adminSecurityPassInput').value = '';
                document.getElementById('adminPasswordModal').classList.remove('hidden');
            } else {
                toggleAdminPanel();
            }
        }

        function closeAdminPasswordModal() {
            document.getElementById('adminPasswordModal').classList.add('hidden');
        }

        function verifyAndOpenAdminPanel() {
            let passStore = JSON.parse(localStorage.getItem('ssx_admin_passwords') || '{}');
            let branchPass = passStore[currentBranch];
            let entered = document.getElementById('adminSecurityPassInput').value;

            if (entered === branchPass) {
                closeAdminPasswordModal();
                toggleAdminPanel();
            } else {
                showCustomAlert('Incorrect Password', 'The password entered for this branch admin panel is incorrect.');
            }
        }

        function toggleAdminPanel() {
            const sec = document.getElementById('adminPanelSection');
            sec.classList.toggle('hidden');
            if (!sec.classList.contains('hidden')) {
                loadAdminPanelData();
                const adminTabs = ['users', 'roles', 'labBranch', 'deptColors', 'manageRacks', 'discardAlerts', 'hostingConfig', 'printer', 'gridDisplay', 'dataBackup', 'deleteData'];
                rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;
                let roleObj = rolesList.find(r => r.name === currentRole) || { permissions: [] };
                let perms = roleObj.permissions || [];
                let firstVisible = adminTabs.find(t => perms.includes(t) || currentRole === 'Super Admin' || currentRole === 'Admin');
                if (firstVisible) {
                    switchAdminTab(firstVisible + 'Tab', document.getElementById(`adm_nav_${firstVisible}`));
                }
            }
        }

        function switchAdminTab(tabId, btnElement) {
            document.querySelectorAll('.admin-tab-content').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('bg-blue-600', 'text-white'));
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.remove('hidden');
            if (btnElement) btnElement.classList.add('bg-blue-600', 'text-white');
        }

        function loadAdminPanelData() {
            loadUsersTable();
            loadRolesList();
            loadBranchesAdminList();
            loadLabInfoForBranch();
            loadDeptManagerList();
            loadManageRacksList();
            loadPerDeptDiscardRules();
            populateHostingUIState();
            loadDiscardedAutoDeleteSetting();
        }

        function saveUserAccount() {
            const u = document.getElementById('newUsername').value.trim();
            const p = document.getElementById('newPassword').value.trim();
            const r = document.getElementById('newUserRole').value;
            const editIdx = parseInt(document.getElementById('editingUserIndex').value);
            const checkedBranches = Array.from(document.querySelectorAll('.user-branch-checkbox:checked')).map(cb => cb.value);
            
            if (!u) {
                showCustomAlert('Validation Error', 'Username enter karein.');
                return;
            }

            usersList = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;

            if (editIdx > -1) {
                usersList[editIdx].username = u;
                if (p !== '') usersList[editIdx].password = p;
                usersList[editIdx].role = r;
                usersList[editIdx].branches = checkedBranches;
            } else {
                if (!p) {
                    showCustomAlert('Validation Error', 'Naye user ke liye password lazmi hai.');
                    return;
                }
                usersList.push({ username: u, password: p, role: r, branches: checkedBranches });
            }

            localStorage.setItem('ssx_users_list', JSON.stringify(usersList));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }

            resetUserForm();
            loadUsersTable();
            showCustomAlert('Saved', `User <b>${u}</b> saved.`);
        }

        function loadUsersTable() {
            const tbody = document.getElementById('usersTableBody');
            const multiBox = document.getElementById('userMultiBranchCheckboxes');
            if (!tbody) return;

            usersList = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;

            multiBox.innerHTML = '';
            branchesList.forEach(b => {
                multiBox.innerHTML += `<label class="flex items-center space-x-1"><input type="checkbox" value="${b}" class="user-branch-checkbox rounded bg-slate-900 border-darkborder"> <span>${b}</span></label>`;
            });

            tbody.innerHTML = '';
            usersList.forEach((u, idx) => {
                tbody.innerHTML += `<tr>
                    <td class="p-3 font-bold text-white">${u.username}</td>
                    <td class="p-3 font-mono text-emerald-400">${u.password || 'N/A'}</td>
                    <td class="p-3 text-amber-400 font-semibold">${u.role}</td>
                    <td class="p-3 text-blue-400">${(u.branches || []).join(', ')}</td>
                    <td class="p-3 space-x-2">
                        <button onclick="editUser(${idx})" class="text-blue-400 hover:underline"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                        <button onclick="deleteUserAccount(${idx})" class="text-red-400 hover:underline"><i class="fa-solid fa-trash"></i> Delete</button>
                    </td>
                </tr>`;
            });
        }

        function editUser(idx) {
            usersList = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;
            const user = usersList[idx];
            document.getElementById('newUsername').value = user.username;
            document.getElementById('newPassword').value = user.password || '';
            document.getElementById('newUserRole').value = user.role;
            document.getElementById('editingUserIndex').value = idx;
            document.getElementById('userFormTitle').innerText = `Edit User: ${user.username}`;
            document.querySelectorAll('.user-branch-checkbox').forEach(cb => cb.checked = (user.branches || []).includes(cb.value));
        }

        function deleteUserAccount(idx) {
            usersList = JSON.parse(localStorage.getItem('ssx_users_list')) || usersList;
            const u = usersList[idx];
            showCustomConfirm('Delete User', `Permanently delete user <b>${u.username}</b>?`, () => {
                usersList.splice(idx, 1);
                localStorage.setItem('ssx_users_list', JSON.stringify(usersList));
                if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
                loadUsersTable();
                showCustomAlert('Deleted', 'User deleted successfully.');
            });
        }

        function resetUserForm() {
            document.getElementById('newUsername').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('editingUserIndex').value = '-1';
            document.getElementById('userFormTitle').innerText = 'Add New User';
            document.querySelectorAll('.user-branch-checkbox').forEach(cb => cb.checked = false);
        }

        function addNewRole() {
            const rName = document.getElementById('newRoleNameInput').value.trim();
            if (!rName || rolesList.some(r => r.name === rName)) return;
            rolesList.push({ name: rName, permissions: [] });
            localStorage.setItem('ssx_roles_list', JSON.stringify(rolesList));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            document.getElementById('newRoleNameInput').value = '';
            loadRolesList();
            loadBranchesDropdown();
        }

        function deleteRole(roleIdx) {
            rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;
            const roleObj = rolesList[roleIdx];
            if (!roleObj) return;

            if (roleObj.name === 'Super Admin' || roleObj.name === 'Admin' || roleObj.name === 'User') {
                showCustomAlert('Restricted', 'Default system roles cannot be deleted.');
                return;
            }

            showCustomConfirm('Delete Role', `Permanently delete role <b>${roleObj.name}</b>?`, () => {
                rolesList.splice(roleIdx, 1);
                localStorage.setItem('ssx_roles_list', JSON.stringify(rolesList));
                if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
                loadRolesList();
                loadBranchesDropdown();
                showCustomAlert('Deleted', 'Role deleted successfully.');
            });
        }

        function loadRolesList() {
            const container = document.getElementById('rolesListContainer');
            if (!container) return;
            container.innerHTML = '';

            rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;

            const allFeats = [
                { id: 'users', label: 'Admin: Users' }, { id: 'roles', label: 'Admin: Roles' }, { id: 'labBranch', label: 'Admin: Lab & Branch' },
                { id: 'deptColors', label: 'Admin: Depts' }, { id: 'manageRacks', label: 'Admin: Racks' },
                { id: 'discardAlerts', label: 'Admin: Discard Rules' }, { id: 'hostingConfig', label: 'Admin: Hosting' }, { id: 'printer', label: 'Admin: Printer' },
                { id: 'gridDisplay', label: 'Admin: Grid Setup' }, { id: 'dataBackup', label: 'Admin: Data Backup' }, { id: 'deleteData', label: 'Admin: Cleanup' },
                { id: 'feat_startRack', label: 'Front: Start Rack' }, { id: 'feat_addSample', label: 'Front: Add Sample' },
                { id: 'feat_pdfSheet', label: 'Front: PDF Sheet' }, { id: 'feat_sticker', label: 'Front: Print Sticker' }, { id: 'feat_endStorage', label: 'Front: End Storage' }
            ];

            rolesList.forEach((r, idx) => {
                let checkboxesHtml = '';
                allFeats.forEach(feat => {
                    const isChecked = (r.permissions || []).includes(feat.id) ? 'checked' : '';
                    checkboxesHtml += `<label class="flex items-center space-x-1.5"><input type="checkbox" id="chk_${idx}_${feat.id}" value="${feat.id}" ${isChecked} class="rounded bg-slate-900 border-darkborder"> <span>${feat.label}</span></label>`;
                });

                let isDefaultRole = (r.name === 'Super Admin' || r.name === 'Admin' || r.name === 'User');
                let deleteBtnHtml = isDefaultRole ? '' : `<button onclick="deleteRole(${idx})" class="bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white px-3 py-1 rounded text-xs font-semibold"><i class="fa-solid fa-trash mr-1"></i> Delete Role</button>`;

                container.innerHTML += `<div class="p-3.5 bg-slate-800 rounded-lg border border-darkborder space-y-3">
                    <div class="flex justify-between items-center text-xs border-b border-darkborder pb-2">
                        <input type="text" id="role_name_input_${idx}" value="${r.name}" class="bg-slate-900 border border-darkborder px-2 py-1 rounded text-amber-300 font-bold">
                        <div class="space-x-2">
                            <button onclick="saveSingleRolePermissions(${idx})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-xs font-semibold"><i class="fa-solid fa-floppy-disk mr-1"></i> Update Role</button>
                            ${deleteBtnHtml}
                        </div>
                    </div>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">${checkboxesHtml}</div>
                </div>`;
            });
        }

        function saveSingleRolePermissions(roleIdx) {
            rolesList = JSON.parse(localStorage.getItem('ssx_roles_list')) || rolesList;
            let role = rolesList[roleIdx];
            const updatedName = document.getElementById(`role_name_input_${roleIdx}`).value.trim();
            if (updatedName) role.name = updatedName;

            role.permissions = [];
            const allFeats = ['users', 'roles', 'labBranch', 'deptColors', 'manageRacks', 'discardAlerts', 'hostingConfig', 'printer', 'gridDisplay', 'dataBackup', 'deleteData', 'feat_startRack', 'feat_addSample', 'feat_pdfSheet', 'feat_sticker', 'feat_endStorage'];
            
            allFeats.forEach(f => {
                const chk = document.getElementById(`chk_${roleIdx}_${f}`);
                if (chk && chk.checked) role.permissions.push(f);
            });

            localStorage.setItem('ssx_roles_list', JSON.stringify(rolesList));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            applyRolePermissionsUI();
            showCustomAlert('Role Saved', `Permissions updated for <b>${role.name}</b>.`);
        }

        function addNewBranch() {
            const bName = document.getElementById('newBranchNameInput').value.trim();
            if (!bName || branchesList.includes(bName)) return;
            branchesList.push(bName);
            localStorage.setItem('ssx_branches_list', JSON.stringify(branchesList));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            document.getElementById('newBranchNameInput').value = '';
            loadBranchesAdminList();
            loadBranchesDropdown();
        }

        function loadBranchesAdminList() {
            const container = document.getElementById('branchesListContainer');
            if (!container) return;
            container.innerHTML = '';
            let passStore = JSON.parse(localStorage.getItem('ssx_admin_passwords') || '{}');

            branchesList.forEach((b, idx) => {
                let curPass = passStore[b] || '';
                container.innerHTML += `<div class="p-3 bg-slate-800 rounded border border-darkborder space-y-2 text-xs">
                    <div class="flex justify-between items-center">
                        <input type="text" id="branch_input_${idx}" value="${b}" class="bg-slate-900 border border-darkborder px-2 py-1 rounded text-white font-semibold">
                        <button onclick="updateBranchName(${idx})" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded text-[11px] font-semibold"><i class="fa-solid fa-floppy-disk mr-1"></i> Update Name</button>
                    </div>
                    <div class="flex items-center space-x-2 pt-1">
                        <span class="text-slate-400">Admin Password:</span>
                        <div class="relative flex-1">
                            <input type="password" id="branch_pass_${idx}" value="${curPass}" placeholder="Set Admin Panel Password..." class="w-full bg-slate-900 border border-darkborder px-2 py-1 rounded text-white pr-8">
                            <button type="button" onclick="togglePasswordVisibility('branch_pass_${idx}', this)" class="absolute right-2 top-1.5 text-slate-400 hover:text-white"><i class="fa-solid fa-eye"></i></button>
                        </div>
                        <button onclick="saveBranchAdminPassword('${b}', ${idx})" class="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-[11px] font-semibold">Save Password</button>
                    </div>
                </div>`;
            });
        }

        function saveBranchAdminPassword(branchName, idx) {
            let pass = document.getElementById(`branch_pass_${idx}`).value;
            let passStore = JSON.parse(localStorage.getItem('ssx_admin_passwords') || '{}');
            passStore[branchName] = pass;
            localStorage.setItem('ssx_admin_passwords', JSON.stringify(passStore));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            showCustomAlert('Saved', `Admin panel password saved for <b>${branchName}</b>.`);
        }

        function updateBranchName(idx) {
            const newVal = document.getElementById(`branch_input_${idx}`).value.trim();
            if (!newVal) return;
            branchesList[idx] = newVal;
            localStorage.setItem('ssx_branches_list', JSON.stringify(branchesList));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            loadBranchesAdminList();
            loadBranchesDropdown();
            showCustomAlert('Saved', 'Branch updated.');
        }

        function loadLabInfoForBranch() {
            const b = document.getElementById('labInfoBranchSelect').value || currentBranch;
            document.getElementById('labNameInput').value = localStorage.getItem(`ssx_lab_name_${b}`) || `${b} Laboratory`;
            document.getElementById('labContactInput').value = localStorage.getItem(`ssx_lab_contact_${b}`) || '+92 300 1234567';
            document.getElementById('labAddressInput').value = localStorage.getItem(`ssx_lab_address_${b}`) || 'Diagnostic Tower';
        }

        function saveLabInfoForBranch() {
            const b = document.getElementById('labInfoBranchSelect').value || currentBranch;
            const name = document.getElementById('labNameInput').value;
            const contact = document.getElementById('labContactInput').value;
            const address = document.getElementById('labAddressInput').value;

            localStorage.setItem(`ssx_lab_name_${b}`, name);
            localStorage.setItem(`ssx_lab_contact_${b}`, contact);
            localStorage.setItem(`ssx_lab_address_${b}`, address);

            let allInfo = JSON.parse(localStorage.getItem('ssx_lab_info_store') || '{}');
            allInfo[b] = { name, contact, address };
            localStorage.setItem('ssx_lab_info_store', JSON.stringify(allInfo));

            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }

            loadHeaderLabInfo();
            showCustomAlert('Saved', `Lab Info saved for <b>${b}</b>.`);
        }

        function saveDeptRule() {
            const id = document.getElementById('newDeptId').value.trim().toUpperCase();
            const name = document.getElementById('newDeptName').value.trim();
            const color = document.getElementById('newDeptColor').value;
            const editIdx = parseInt(document.getElementById('editingDeptIndex').value);
            if (!id || !name) return;

            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;

            if (editIdx > -1) {
                departments[editIdx] = { ...departments[editIdx], id, name, color };
            } else {
                let existing = departments.find(d => d.id === id);
                if (existing) { existing.name = name; existing.color = color; }
                else { departments.push({ id, name, capacity: 100, color, defaultDays: 7, minHours: 0, alertDays: 2 }); }
            }

            localStorage.setItem('ssx_departments', JSON.stringify(departments));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }

            document.getElementById('editingDeptIndex').value = '-1';
            document.getElementById('newDeptId').value = '';
            document.getElementById('newDeptName').value = '';
            loadDeptManagerList();
            initDeptDropdowns();
            showCustomAlert('Saved', `Department <b>${name}</b> saved.`);
        }

        function loadDeptManagerList() {
            const container = document.getElementById('deptListContainer');
            if (!container) return;
            container.innerHTML = '';
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            departments.forEach((d, idx) => {
                container.innerHTML += `<div class="p-2.5 bg-slate-800 rounded border border-darkborder flex justify-between items-center text-xs">
                    <div><span class="font-bold" style="color:${d.color}">${d.name} (${d.id})</span></div>
                    <button onclick="editDept(${idx})" class="text-blue-400 hover:underline"><i class="fa-solid fa-pen-to-square"></i> Edit</button>
                </div>`;
            });
        }

        function editDept(idx) {
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const d = departments[idx];
            document.getElementById('newDeptId').value = d.id;
            document.getElementById('newDeptName').value = d.name;
            document.getElementById('newDeptColor').value = d.color;
            document.getElementById('editingDeptIndex').value = idx;
        }

        function saveRackManagerConfig() {
            const id = document.getElementById('rackMgrId').value.trim().toUpperCase();
            const cap = parseInt(document.getElementById('rackMgrCap').value) || 100;
            const life = parseInt(document.getElementById('rackMgrLife').value) || 7;
            rackDateFormatPrefix = document.getElementById('rackDateFormatSelect').value;
            if (!id) return;

            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            let dept = departments.find(d => d.id === id);
            if (dept) {
                dept.capacity = cap;
                dept.defaultDays = life;
            }
            localStorage.setItem('ssx_departments', JSON.stringify(departments));
            if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
            loadManageRacksList();
            showCustomAlert('Saved', `Rack rules saved for Dept <b>${id}</b>.`);
        }

        function loadManageRacksList() {
            const container = document.getElementById('manageRacksListContainer');
            if (!container) return;
            container.innerHTML = '';
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            departments.forEach((d) => {
                container.innerHTML += `<div class="p-3 bg-slate-800 rounded border border-darkborder flex justify-between items-center text-xs">
                    <div>
                        <span class="font-bold text-amber-300" style="color:${d.color}">${d.name} (${d.id})</span>
                        <span class="text-slate-400 ml-3">Capacity: ${d.capacity} | Life: ${d.defaultDays} Days</span>
                    </div>
                </div>`;
            });
        }

        function loadPerDeptDiscardRules() {
            const container = document.getElementById('perDeptDiscardContainer');
            if (!container) return;
            container.innerHTML = '';
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            departments.forEach((d) => {
                container.innerHTML += `<div class="p-3 bg-slate-800 rounded border border-darkborder space-y-2 text-xs">
                    <p class="font-bold" style="color:${d.color}">${d.name} (${d.id}) Discard Rule</p>
                    <div class="grid grid-cols-2 gap-2">
                        <div><label class="text-[10px] text-slate-400">Alert Days</label><input type="number" id="alert_days_${d.id}" value="${d.alertDays}" class="w-full px-2 py-1 bg-slate-900 border border-darkborder rounded text-white"></div>
                        <div><label class="text-[10px] text-slate-400">Min Storage Hours</label><input type="number" id="min_hours_${d.id}" value="${d.minHours}" class="w-full px-2 py-1 bg-slate-900 border border-darkborder rounded text-white"></div>
                    </div>
                    <button onclick="saveDeptDiscardRule('${d.id}')" class="bg-red-600 hover:bg-red-500 text-white px-3 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-floppy-disk mr-1"></i> Update & Save</button>
                </div>`;
            });
        }

        function saveDeptDiscardRule(deptId) {
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            let dept = departments.find(d => d.id === deptId);
            if (dept) {
                dept.alertDays = parseInt(document.getElementById(`alert_days_${deptId}`).value) || 2;
                dept.minHours = parseInt(document.getElementById(`min_hours_${deptId}`).value) || 0;
                localStorage.setItem('ssx_departments', JSON.stringify(departments));
                if (typeof window.syncSystemConfigToCloud === 'function') { window.syncSystemConfigToCloud(); }
                showCustomAlert('Saved', `Discard rule saved for Dept <b>${deptId}</b>.`);
            }
        }

        function saveDiscardedAutoDeleteConfig() {
            const days = parseInt(document.getElementById('discardedAutoDeleteDays').value) || 0;
            localStorage.setItem('ssx_discarded_auto_delete_days', days);
            showCustomAlert('Saved', `Discarded racks auto-delete set to <b>${days}</b> days.`);
        }

        function loadDiscardedAutoDeleteSetting() {
            const input = document.getElementById('discardedAutoDeleteDays');
            if (input) {
                input.value = localStorage.getItem('ssx_discarded_auto_delete_days') || '30';
            }
        }

        function checkAutoDeleteDiscardedRacks() {
            let autoDays = parseInt(localStorage.getItem('ssx_discarded_auto_delete_days') || '30');
            if (autoDays <= 0) return;
            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            let now = new Date().getTime();
            let filtered = racks.filter(r => {
                if (r.status === 'Discarded' && r.discardedDate) {
                    let discTime = new Date(r.discardedDate).getTime();
                    let diffDays = (now - discTime) / (1000 * 60 * 60 * 24);
                    if (diffDays > autoDays) return false;
                }
                return true;
            });
            if (filtered.length !== racks.length) {
                localStorage.setItem('ssx_racks', JSON.stringify(filtered));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
            }
        }

        function populateHostingUIState() {
            document.getElementById('fb_apiKey').value = firebaseConfigData.apiKey;
            document.getElementById('fb_authDomain').value = firebaseConfigData.authDomain;
            document.getElementById('fb_projectId').value = firebaseConfigData.projectId;
            document.getElementById('fb_storageBucket').value = firebaseConfigData.storageBucket;
            document.getElementById('fb_messagingSenderId').value = firebaseConfigData.messagingSenderId;
            document.getElementById('fb_appId').value = firebaseConfigData.appId;
            document.getElementById('fb_databaseURL').value = firebaseConfigData.databaseURL;

            let currentMode = localStorage.getItem('ssx_hosting_mode') || 'LIVE';
            const modeSelect = document.getElementById('hostingModeSelect');
            if (modeSelect) {
                modeSelect.value = currentMode;
            }
            toggleHostingModeUI();
        }

        function saveHostingConfig() {
            const mode = document.getElementById('hostingModeSelect').value;
            localStorage.setItem('ssx_hosting_mode', mode);
            showCustomAlert('Saved', `Hosting configuration saved. Mode set to: <b>${mode}</b>.`);
        }

        function toggleHostingModeUI() {
            const m = document.getElementById('hostingModeSelect').value;
            document.getElementById('liveModeOptionsContainer').classList.toggle('hidden', m === 'OFFLINE');
        }

        function toggleBackendFields() {
            const b = document.getElementById('liveBackendSelect').value;
            document.getElementById('firebaseCredentialsBox').classList.toggle('hidden', b !== 'FIREBASE');
        }

        function saveGlobalGridSettings() {
            gridConfig.colWidth = parseInt(document.getElementById('gridColWidth').value) || 65;
            gridConfig.rowHeight = parseInt(document.getElementById('gridRowHeight').value) || 42;
            gridConfig.fontSizePx = parseInt(document.getElementById('gridFontSizePx').value) || 12;
            gridConfig.showEmptyPos = document.getElementById('showEmptyPosCheck').value;
            renderLiveRackGrid();
            showCustomAlert('Saved', 'Grid settings updated and set as default.');
        }

        function purgeSamplesData() {
            const b = document.getElementById('cleanupBranchSelect').value;
            showCustomConfirm('Delete Samples', `Delete all samples for branch <b>${b}</b>?`, () => {
                let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]').filter(s => s.branch !== b);
                localStorage.setItem('ssx_samples', JSON.stringify(samples));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
                showCustomAlert('Purged', `Samples cleared for ${b}.`);
            });
        }

        function purgeRacksData() {
            const b = document.getElementById('cleanupBranchSelect').value;
            showCustomConfirm('Delete Racks', `Delete all racks for branch <b>${b}</b>?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch !== b);
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
                showCustomAlert('Purged', `Racks cleared for ${b}.`);
            });
        }

        function initDeptDropdowns() {
            const sel = document.getElementById('storageTypeSelect');
            if (!sel) return;
            sel.innerHTML = '';
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            departments.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.innerText = `${d.name} (${d.id})`;
                sel.appendChild(opt);
            });
            onStorageTypeChange();
        }

        function onStorageTypeChange() {
            activeStorageType = document.getElementById('storageTypeSelect').value;
            refreshActiveRackDropdowns();
        }

        function refreshActiveRackDropdowns() {
            const activeSel = document.getElementById('activeRackSelect');
            if (!activeSel) return;

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch === currentBranch);
            activeSel.innerHTML = '';

            const activeForType = racks.filter(r => r.type === activeStorageType && r.status === 'Active');
            activeForType.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id;
                opt.innerText = `${r.id} (${(r.samples || []).length} samples)`;
                activeSel.appendChild(opt);
            });

            if (activeForType.length > 0) {
                if (!activeRackId || !activeForType.some(r => r.id === activeRackId)) {
                    activeRackId = activeForType[0].id;
                    localStorage.setItem('ssx_active_rack_id', activeRackId);
                }
            } else {
                activeRackId = null;
                localStorage.removeItem('ssx_active_rack_id');
            }

            if (activeRackId) activeSel.value = activeRackId;
            renderLiveRackGrid();
        }

        function onActiveRackChange() {
            activeRackId = document.getElementById('activeRackSelect').value;
            localStorage.setItem('ssx_active_rack_id', activeRackId);
            renderLiveRackGrid();
        }

        function startNewRackPrompt() {
            showCustomConfirm('Start New Rack', `Create new active rack for Dept <b>${activeStorageType}</b>?`, () => {
                const now = new Date();
                const dd = String(now.getDate()).padStart(2, '0');
                const mm = String(now.getMonth() + 1).padStart(2, '0');
                const yy = String(now.getFullYear()).slice(-2);

                let datePart = `${dd}-${mm}-${yy}`;
                if (rackDateFormatPrefix === 'DD-MM') datePart = `${dd}-${mm}`;
                if (rackDateFormatPrefix === 'YY-MM-DD') datePart = `${yy}-${mm}-${dd}`;

                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                const counter = String(racks.filter(r => r.type === activeStorageType).length + 1).padStart(2, '0');
                const rackId = `${activeStorageType}-${datePart}-${counter}`;

                departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
                const dept = departments.find(d => d.id === activeStorageType) || { defaultDays: 7 };
                const tentative = new Date(now.getTime() + (dept.defaultDays * 86400000)).toISOString();

                racks.push({ id: rackId, type: activeStorageType, branch: currentBranch, createdBy: currentUser, createdAt: now.toISOString(), tentativeDiscard: tentative, status: 'Active', samples: [] });
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                activeRackId = rackId;
                localStorage.setItem('ssx_active_rack_id', activeRackId);

                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();

                refreshActiveRackDropdowns();
                renderRackList();
            });
        }

        function addSampleToRack() {
            const input = document.getElementById('sampleIdInput');
            const sampleId = input.value.trim();
            if (!sampleId) return;

            if (!activeRackId) {
                showCustomAlert('No Active Rack', 'Please click "Start New Rack" first.');
                return;
            }

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            let rack = racks.find(r => r.id === activeRackId);
            if (!rack) return;

            rack.samples = rack.samples || [];
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const dept = departments.find(d => d.id === rack.type) || { capacity: 100, defaultDays: 7 };

            if (rack.samples.length >= dept.capacity) {
                showCustomAlert('Rack Full', `Rack ${activeRackId} has reached max capacity.`);
                return;
            }

            let chosenPos = null;
            for (let i = 1; i <= dept.capacity; i++) {
                const posLabel = getPositionLabel(i);
                if (!rack.samples.some(s => s.position === posLabel)) {
                    chosenPos = posLabel;
                    break;
                }
            }

            const now = new Date();
            const expiry = new Date(now.getTime() + (dept.defaultDays * 86400000));

            rack.samples.push({ position: chosenPos, sampleId: sampleId });
            let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');
            samples.push({ id: sampleId, rack: rack.id, position: chosenPos, type: rack.type, branch: currentBranch, entryDate: now.toISOString(), expiryDate: expiry.toISOString(), status: 'Active' });

            localStorage.setItem('ssx_racks', JSON.stringify(racks));
            localStorage.setItem('ssx_samples', JSON.stringify(samples));

            if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();

            input.value = '';
            refreshAllUIViews();
        }

        function renderLiveRackGrid() {
            const container = document.getElementById('liveRackGridContainer');
            const label = document.getElementById('currentRackLabel');
            const badge = document.getElementById('rackCapacityBadge');
            const liveList = document.getElementById('liveRackSampleList');

            if (!activeRackId) {
                label.innerText = "No Active Rack Selected";
                badge.innerText = "Capacity: 0/0";
                container.innerHTML = `<p class="text-slate-500 text-xs">No active rack selected for Dept ${activeStorageType}. Click 'Start New Rack'.</p>`;
                liveList.innerHTML = `<p class="text-slate-500 text-xs text-center py-4">No samples.</p>`;
                return;
            }

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            const rack = racks.find(r => r.id === activeRackId);
            if (!rack) return;

            rack.samples = rack.samples || [];
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const dept = departments.find(d => d.id === rack.type) || { capacity: 100, color: '#3b82f6' };
            label.innerText = `Rack: ${rack.id} (${dept.name})`;
            badge.innerText = `Cap: ${rack.samples.length}/${dept.capacity}`;

            let gridHtml = `<div class="grid grid-cols-10 gap-1.5 w-full">`;
            for (let i = 1; i <= dept.capacity; i++) {
                const posStr = getPositionLabel(i);
                const sample = rack.samples.find(s => s.position === posStr);
                
                if (sample) {
                    gridHtml += `<div title="Position ${posStr}: ${sample.sampleId}" class="rounded flex items-center justify-center text-white font-bold shadow px-1 truncate" style="background-color: ${dept.color}; width: ${gridConfig.colWidth}px; height: ${gridConfig.rowHeight}px; font-size: ${gridConfig.fontSizePx}px;">
                        ${sample.sampleId}
                    </div>`;
                } else {
                    const showTxt = (gridConfig.showEmptyPos === 'yes') ? posStr : '';
                    gridHtml += `<div class="rounded flex items-center justify-center text-slate-500 border border-dashed border-darkborder bg-slate-900/50" style="width: ${gridConfig.colWidth}px; height: ${gridConfig.rowHeight}px; font-size: ${gridConfig.fontSizePx - 2}px;">${showTxt}</div>`;
                }
            }
            gridHtml += `</div>`;
            container.innerHTML = gridHtml;

            const reversedSamples = [...rack.samples].reverse();
            if (reversedSamples.length === 0) {
                liveList.innerHTML = `<p class="text-slate-500 text-xs text-center py-4">No samples in active rack.</p>`;
            } else {
                let listHtml = '';
                reversedSamples.forEach(s => {
                    listHtml += `<div class="p-2 bg-slate-800 rounded border border-darkborder flex justify-between items-center text-xs">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" value="${s.sampleId}___${s.position}" class="active-sample-checkbox rounded bg-slate-900 border-darkborder">
                            <span class="font-bold text-white">${s.sampleId}</span>
                        </div>
                        <span class="text-[10px] text-blue-400 bg-blue-900/40 px-1.5 py-0.5 rounded font-mono font-bold">${s.position}</span>
                    </div>`;
                });
                liveList.innerHTML = listHtml;
            }
        }

        function getPositionLabel(index) {
            const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
            const rIdx = Math.floor((index - 1) / 10);
            const cIdx = ((index - 1) % 10) + 1;
            return (rows[rIdx] || 'X') + cIdx;
        }

        function endStorageCurrentRack() {
            if (!activeRackId) return;
            showCustomConfirm('End Storage', `Mark rack <b>${activeRackId}</b> as Stored?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                let r = racks.find(x => x.id === activeRackId);
                if (r) {
                    r.status = 'Stored';
                    localStorage.setItem('ssx_racks', JSON.stringify(racks));
                    activeRackId = null;
                    localStorage.removeItem('ssx_active_rack_id');
                    
                    if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                    refreshAllUIViews();
                }
            });
        }

        function executeSampleSearch() {
            const query = document.getElementById('searchSampleInput').value.trim();
            const summaryBox = document.getElementById('searchSingleLineSummary');
            const gridBox = document.getElementById('searchResultsGridContainer');
            const btnToggle = document.getElementById('btnToggleSearchGrid');

            if (!query) return;

            let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]').filter(s => s.branch === currentBranch);
            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            
            const matches = samples.filter(s => s.id.toLowerCase() === query.toLowerCase());

            if (matches.length === 0) {
                summaryBox.classList.remove('hidden');
                summaryBox.innerHTML = `<span class="text-red-400 font-bold text-xs">No exact match found for Sample ID: ${query}</span>`;
                gridBox.classList.add('hidden');
                btnToggle.classList.add('hidden');
                return;
            }

            summaryBox.classList.remove('hidden');
            btnToggle.classList.remove('hidden');

            let html = `
                <div class="flex items-center justify-between mb-2 pb-1 border-b border-darkborder">
                    <span class="text-xs font-bold text-white">Search Matches for: <span class="text-blue-400">${query}</span> (${matches.length} position(s) found)</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">`;

            matches.forEach((m) => {
                departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
                const dept = departments.find(d => d.id === m.type) || { color: '#3b82f6' };
                let parentRack = racks.find(r => r.id === m.rack);

                let realStatus = m.status || 'Active';
                if (parentRack && parentRack.status === 'Discarded') {
                    realStatus = 'Discarded';
                }

                let isRetrieved = realStatus === 'Retrieved';
                let isDiscarded = realStatus === 'Discarded';
                
                let chipBgClass = isRetrieved ? 'blink-blue-retrieved' : '';
                let borderStyle = isRetrieved ? '' : `style="border-left: 4px solid ${dept.color};"`;

                html += `
                    <div class="p-2.5 bg-slate-800 rounded-lg border border-darkborder flex justify-between items-center text-xs ${chipBgClass}" ${borderStyle}>
                        <div>
                            <p class="font-bold text-white">Rack: ${m.rack}</p>
                            <p class="text-[11px] text-slate-300">Pos: <span class="text-emerald-400 font-bold">${m.position}</span></p>
                            ${isDiscarded ? '<span class="text-[10px] font-bold text-red-400 animate-pulse">[DISCARDED]</span>' : `<span class="text-[10px] text-slate-400">${realStatus}</span>`}
                        </div>
                        <div class="flex flex-col space-y-1">
                            <button onclick="renderSearchTargetGrid('${m.rack}', '${m.position}', '${m.id}')" class="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-table-cells mr-1"></i> View Grid</button>
                            ${!isRetrieved && !isDiscarded ? `<button onclick="retrieveSamplePrompt('${m.id}', '${m.rack}', '${m.position}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-hand-holding-medical mr-1"></i> Retrieve</button>` : ''}
                        </div>
                    </div>`;
            });

            html += `</div>`;
            summaryBox.innerHTML = html;
            renderSearchTargetGrid(matches[0].rack, matches[0].position, matches[0].id);
        }

        function toggleSearchGridVisibility() {
            const gridBox = document.getElementById('searchResultsGridContainer');
            gridBox.classList.toggle('hidden');
        }

        function renderSearchTargetGrid(rackId, targetPos, sampleId) {
            const gridBox = document.getElementById('searchResultsGridContainer');
            gridBox.classList.remove('hidden');

            let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');
            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            
            const sample = samples.find(s => s.rack === rackId && s.position === targetPos && s.id === sampleId);
            const rack = racks.find(r => r.id === rackId);
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const dept = departments.find(d => d.id === (rack ? rack.type : 'C')) || { capacity: 100, color: '#3b82f6' };

            let realStatus = sample ? sample.status : 'Active';
            if (rack && rack.status === 'Discarded') realStatus = 'Discarded';

            let gridHtml = `
                <div class="flex justify-between items-center w-full max-w-xl mb-3 bg-slate-800 p-2 rounded border border-darkborder text-xs">
                    <div>
                        <p class="font-bold text-white">Target Rack: ${rackId} | Target Pos: <span class="text-emerald-400">${targetPos}</span></p>
                        <p class="text-[11px] text-slate-300">Status: <span class="text-amber-400 font-semibold">${realStatus}</span></p>
                    </div>
                    ${realStatus !== 'Retrieved' && realStatus !== 'Discarded' ? `<button onclick="retrieveSamplePrompt('${sampleId}', '${rackId}', '${targetPos}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold"><i class="fa-solid fa-hand-holding-medical mr-1"></i> Retrieve Sample</button>` : ''}
                </div>
                <div class="grid grid-cols-10 gap-1.5 w-full">`;

            for (let i = 1; i <= dept.capacity; i++) {
                const posStr = getPositionLabel(i);
                if (posStr === targetPos) {
                    gridHtml += `<div class="rounded flex items-center justify-center font-bold blink-target shadow px-1 text-white truncate" style="background-color:${dept.color}; width:${gridConfig.colWidth}px; height:${gridConfig.rowHeight}px; font-size:${gridConfig.fontSizePx}px;">${posStr}</div>`;
                } else {
                    gridHtml += `<div class="rounded flex items-center justify-center text-slate-500 border border-darkborder bg-slate-900/60" style="width:${gridConfig.colWidth}px; height:${gridConfig.rowHeight}px; font-size:${gridConfig.fontSizePx - 2}px;">${posStr}</div>`;
                }
            }
            gridHtml += `</div>`;
            gridBox.innerHTML = gridHtml;
        }

        function retrieveSamplePrompt(sampleId, rackId, position) {
            showCustomConfirm('Retrieve Sample', `Retrieve sample <b>${sampleId}</b> from rack <b>${rackId}</b>?`, () => {
                let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');
                let s = samples.find(x => x.id === sampleId && x.rack === rackId && x.position === position);
                if (s) {
                    s.status = 'Retrieved';
                    localStorage.setItem('ssx_samples', JSON.stringify(samples));

                    let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                    let r = racks.find(x => x.id === rackId);
                    if (r) {
                        r.samples = (r.samples || []).filter(sp => !(sp.sampleId === sampleId && sp.position === position));
                        localStorage.setItem('ssx_racks', JSON.stringify(racks));
                    }

                    if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();

                    refreshAllUIViews();
                    executeSampleSearch();
                    showCustomAlert('Success', `Sample <b>${sampleId}</b> retrieved.`);
                }
            });
        }

        function renderSampleList() {
            const tbody = document.getElementById('sampleListTableBody');
            const filter = document.getElementById('sampleStatusFilter') ? document.getElementById('sampleStatusFilter').value : 'All';
            if (!tbody) return;

            let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]').filter(s => s.branch === currentBranch);
            if (filter !== 'All') samples = samples.filter(s => s.status === filter);

            tbody.innerHTML = '';
            samples.forEach(s => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-800/60 cursor-pointer transition";
                tr.onclick = (e) => { if (e.target.type !== 'checkbox') previewSideRack(s.rack, s.position, s.id); };

                tr.innerHTML = `
                    <td class="p-2.5"><input type="checkbox" value="${s.id}___${s.rack}___${s.position}" class="sample-checkbox rounded bg-slate-800 border-darkborder"></td>
                    <td class="p-2.5 font-bold text-white">${s.id}</td>
                    <td class="p-2.5 font-mono text-emerald-400 font-bold">${s.position}</td>
                    <td class="p-2.5 text-blue-400 font-semibold">${s.rack} (${s.type})</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function previewSideRack(rackId, highlightPos, sampleId) {
            const container = document.getElementById('inventorySideRackPreview');
            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            const rack = racks.find(r => r.id === rackId);
            if (!rack) {
                container.innerHTML = `<p class="text-slate-500 text-xs">Rack ${rackId} not found.</p>`;
                return;
            }

            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const dept = departments.find(d => d.id === rack.type) || { capacity: 100, color: '#3b82f6' };
            let gridHtml = `
                <div class="w-full text-left mb-2 bg-slate-800 p-2 rounded border border-darkborder text-xs">
                    <span class="font-bold text-white">Rack: ${rackId}</span> | Selected: <span class="text-emerald-400 font-bold">${sampleId}</span> (${highlightPos})
                </div>
                <div class="grid grid-cols-10 gap-1 w-full">`;

            for (let i = 1; i <= dept.capacity; i++) {
                const posStr = getPositionLabel(i);
                const sampleInPos = (rack.samples || []).find(s => s.position === posStr);
                if (posStr === highlightPos) {
                    gridHtml += `<div class="h-7 rounded flex items-center justify-center text-[9px] font-bold text-white blink-target" style="background-color:${dept.color}">${posStr}</div>`;
                } else if (sampleInPos) {
                    gridHtml += `<div class="h-7 rounded flex items-center justify-center text-[9px] font-bold text-white truncate px-0.5" style="background-color:${dept.color}" title="${sampleInPos.sampleId}">${sampleInPos.sampleId}</div>`;
                } else {
                    gridHtml += `<div class="h-7 rounded flex items-center justify-center text-[8px] border border-darkborder bg-slate-900/60 text-slate-500">${posStr}</div>`;
                }
            }
            gridHtml += `</div>`;
            container.innerHTML = gridHtml;
        }

        function renderRackList() {
            const container = document.getElementById('rackInventoryContent');
            const filter = document.getElementById('rackStatusFilter').value;
            if (!container) return;

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch === currentBranch && r.status !== 'Discarded');
            if (filter !== 'All') racks = racks.filter(r => r.status === filter);

            let html = '';
            racks.forEach(r => {
                r.samples = r.samples || [];
                const now = new Date();
                const isOverdue = r.tentativeDiscard && new Date(r.tentativeDiscard) < now;
                const rowClass = isOverdue ? 'row-overdue-blink' : '';

                html += `
                <div class="bg-slate-900 border border-darkborder rounded-xl p-3 space-y-2 ${rowClass}">
                    <div class="flex flex-wrap justify-between items-center text-xs">
                        <div class="flex items-center space-x-2">
                            <input type="checkbox" value="${r.id}" class="rack-checkbox rounded bg-slate-800 border-darkborder">
                            <span class="font-bold text-blue-400">${r.id}</span>
                            <span class="text-slate-400">(${r.type})</span>
                            <span class="px-2 py-0.5 rounded text-[10px] bg-emerald-900/60 text-emerald-300 font-semibold">${r.status}</span>
                        </div>
                        <div class="flex items-center space-x-1.5">
                            <span class="text-slate-400 text-[11px]">Tentative Discard: <b class="text-amber-300 font-mono">${r.tentativeDiscard ? new Date(r.tentativeDiscard).toLocaleString() : 'N/A'}</b></span>
                            <button onclick="toggleInlineRackAccordion('${r.id}')" class="bg-blue-600/40 hover:bg-blue-600 text-blue-200 border border-blue-500/30 px-2 py-1 rounded text-[10px] font-bold"><i class="fa-solid fa-eye mr-1"></i> View</button>
                            <button onclick="downloadRackSheetPDF('${r.id}')" class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-file-pdf mr-1"></i> Sheet</button>
                            <button onclick="triggerStickerPrintAction('${r.id}')" class="bg-purple-600/30 hover:bg-purple-600/60 text-purple-300 px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-barcode mr-1"></i> Sticker</button>
                            <button onclick="discardSingleRack('${r.id}')" class="bg-amber-600/30 hover:bg-amber-600/60 text-amber-300 px-2 py-1 rounded text-[10px] font-semibold"><i class="fa-solid fa-box-archive mr-1"></i> Discard</button>
                        </div>
                    </div>
                    <div id="inlineAccordion_${r.id}" class="hidden pt-3 border-t border-darkborder grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div class="lg:col-span-2 overflow-x-auto bg-slate-950 p-3 rounded-lg border border-darkborder flex flex-col justify-center items-center">
                            ${renderStaticRackGridHTML(r)}
                        </div>
                        <div class="lg:col-span-1 bg-slate-950 p-3 rounded-lg border border-darkborder max-h-60 overflow-y-auto space-y-1">
                            <p class="font-bold text-xs text-slate-300 border-b border-darkborder pb-1 mb-2">Sample List (${r.samples.length})</p>
                            ${r.samples.length === 0 ? '<p class="text-[11px] text-slate-500">No samples in rack.</p>' : r.samples.map(sp => `<div class="p-1.5 bg-slate-900 rounded text-[11px] flex justify-between"><span class="font-bold text-white">${sp.sampleId}</span><span class="text-emerald-400 font-mono">${sp.position}</span></div>`).join('')}
                        </div>
                    </div>
                </div>`;
            });
            container.innerHTML = html;
        }

        function renderStaticRackGridHTML(rack) {
            departments = JSON.parse(localStorage.getItem('ssx_departments')) || departments;
            const dept = departments.find(d => d.id === rack.type) || { capacity: 100, color: '#3b82f6' };
            let gridHtml = `<div class="grid grid-cols-10 gap-1 w-full">`;
            for (let i = 1; i <= dept.capacity; i++) {
                const posStr = getPositionLabel(i);
                const sample = (rack.samples || []).find(s => s.position === posStr);
                if (sample) {
                    gridHtml += `<div class="h-7 rounded flex items-center justify-center text-white font-bold text-[8px] truncate" style="background-color:${dept.color}">${sample.sampleId}</div>`;
                } else {
                    gridHtml += `<div class="h-7 rounded flex items-center justify-center text-slate-600 border border-darkborder bg-slate-900/60 text-[8px]">${posStr}</div>`;
                }
            }
            gridHtml += `</div>`;
            return gridHtml;
        }

        function toggleInlineRackAccordion(rackId) {
            const el = document.getElementById(`inlineAccordion_${rackId}`);
            if (el) el.classList.toggle('hidden');
        }

        function renderDiscardedRacksList() {
            const container = document.getElementById('discardedRacksContent');
            if (!container) return;

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch === currentBranch && r.status === 'Discarded');

            let html = `
            <div class="flex justify-between items-center mb-3">
                <div class="flex items-center space-x-2 text-xs">
                    <label class="flex items-center space-x-1 text-slate-300"><input type="checkbox" onchange="toggleSelectAllDiscarded(this)" class="rounded bg-slate-900 border-darkborder"> <span>Select All</span></label>
                </div>
                <button onclick="deleteSelectedDiscardedRacks()" class="bg-red-600/30 text-red-300 border border-red-500/30 px-2.5 py-1 rounded text-xs font-semibold"><i class="fa-solid fa-trash mr-1"></i> Delete Selected</button>
            </div>
            <table class="w-full text-left border-collapse text-xs"><thead class="bg-slate-900 text-slate-400 border-b border-darkborder"><tr>
                <th class="p-2.5"></th><th class="p-2.5">Rack ID</th><th class="p-2.5">Dept</th><th class="p-2.5">Created By</th><th class="p-2.5">Discard Date & Time</th><th class="p-2.5">Discarded By</th><th class="p-2.5">Action</th>
            </tr></thead><tbody class="divide-y divide-darkborder">`;

            racks.forEach(r => {
                html += `<tr>
                    <td class="p-2.5"><input type="checkbox" value="${r.id}" class="discarded-rack-checkbox rounded bg-slate-800 border-darkborder"></td>
                    <td class="p-2.5 font-bold text-red-400">${r.id}</td>
                    <td class="p-2.5 font-semibold">${r.type}</td>
                    <td class="p-2.5 text-slate-400">${r.createdBy}</td>
                    <td class="p-2.5 font-mono text-[11px] text-amber-300">${r.discardedDate ? new Date(r.discardedDate).toLocaleString() : 'N/A'}</td>
                    <td class="p-2.5 font-bold text-slate-200">${r.discardedBy || 'System'}</td>
                    <td class="p-2.5"><button onclick="deleteSingleDiscardedRack('${r.id}')" class="text-red-400 hover:underline"><i class="fa-solid fa-trash"></i> Delete</button></td>
                </tr>`;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        }

        function toggleSelectAllDiscarded(m) {
            document.querySelectorAll('.discarded-rack-checkbox').forEach(cb => cb.checked = m.checked);
        }

        function deleteSingleDiscardedRack(rackId) {
            showCustomConfirm('Delete Discarded Rack', `Permanently delete rack <b>${rackId}</b>?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                racks = racks.filter(r => r.id !== rackId);
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function deleteSelectedDiscardedRacks() {
            const checked = Array.from(document.querySelectorAll('.discarded-rack-checkbox:checked')).map(cb => cb.value);
            if (checked.length === 0) return;

            showCustomConfirm('Delete Discarded Racks', `Permanently delete ${checked.length} selected discarded rack(s)?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                racks = racks.filter(r => !checked.includes(r.id));
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function discardSingleRack(rackId) {
            showCustomConfirm('Discard Rack', `Mark rack <b>${rackId}</b> as Discarded?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                let r = racks.find(x => x.id === rackId);
                if (r) {
                    r.status = 'Discarded';
                    r.discardedDate = new Date().toISOString();
                    r.discardedBy = currentUser;
                    localStorage.setItem('ssx_racks', JSON.stringify(racks));
                    if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                    refreshAllUIViews();
                }
            });
        }

        function bulkDiscardRacks() {
            const checked = Array.from(document.querySelectorAll('.rack-checkbox:checked')).map(cb => cb.value);
            if (checked.length === 0) return;

            showCustomConfirm('Discard Racks', `Discard ${checked.length} selected rack(s)?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                racks.forEach(r => {
                    if (checked.includes(r.id)) {
                        r.status = 'Discarded';
                        r.discardedDate = new Date().toISOString();
                        r.discardedBy = currentUser;
                    }
                });
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function toggleSelectAllRacks(m) {
            document.querySelectorAll('.rack-checkbox').forEach(cb => cb.checked = m.checked);
        }

        function bulkDeleteRacks() {
            const checkboxes = document.querySelectorAll('.rack-checkbox:checked');
            if (checkboxes.length === 0) return;

            showCustomConfirm('Delete Racks', `Delete ${checkboxes.length} selected rack(s)?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                const checkedIds = Array.from(checkboxes).map(cb => cb.value);
                racks = racks.filter(r => !checkedIds.includes(r.id));
                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function downloadRackSheetPDF(rackId) {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');
            
            const labName = localStorage.getItem(`ssx_lab_name_${currentBranch}`) || `${currentBranch} Laboratory`;
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const daysArr = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayStr = daysArr[now.getDay()];

            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            const rack = racks.find(r => r.id === rackId);
            const deptId = rack ? rack.type : 'C';

            doc.rect(10, 10, 277, 24);
            doc.line(60, 10, 60, 34);
            doc.line(220, 10, 220, 34);

            doc.setFontSize(10);
            doc.text("Lab logo", 25, 24);

            doc.setFontSize(14);
            doc.text(labName, 140, 18, { align: 'center' });
            doc.setFontSize(11);
            doc.text("Specimen Storage and Disposal Data Sheet", 140, 27, { align: 'center' });

            doc.setFontSize(8);
            doc.line(220, 16, 287, 16);
            doc.line(220, 22, 287, 22);
            doc.line(220, 28, 287, 28);
            doc.line(250, 10, 250, 34);

            doc.text("Doc No.", 222, 14); doc.text("PL-PRO-FOR-011", 252, 14);
            doc.text("Issue Date", 222, 20); doc.text(dateStr, 252, 20);
            doc.text("Rev No.", 222, 26); doc.text("00", 252, 26);
            doc.text("Page", 222, 32); doc.text("Page 1 of 1", 252, 32);

            doc.rect(10, 37, 277, 10);
            doc.line(35, 37, 35, 47);
            doc.line(75, 37, 75, 47);
            doc.line(135, 37, 135, 47);
            doc.line(185, 37, 185, 47);
            doc.line(235, 37, 235, 47);

            doc.setFontSize(8);
            doc.text("Branch", 12, 43); doc.text(currentBranch, 37, 43);
            doc.text("Dept", 77, 43); doc.text(deptId, 95, 43);
            doc.text("Date", 137, 43); doc.text(dateStr, 155, 43);
            doc.text("Day", 187, 43); doc.text(dayStr, 205, 43);
            doc.text("Rack No.", 237, 43); doc.text(rackId || 'N/A', 257, 43);

            let gridX = 10, gridY = 50;
            let colWidths = [20, 25.7, 25.7, 25.7, 25.7, 25.7, 25.7, 25.7, 25.7, 25.7, 25.7];
            let rowH = 11;

            doc.rect(gridX, gridY, 277, rowH * 11);
            let colsHeader = ['Position', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
            let rowLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

            let currentX = gridX;
            for (let c = 0; c < colsHeader.length; c++) {
                doc.line(currentX, gridY, currentX, gridY + (rowH * 11));
                doc.setFontSize(8);
                doc.text(colsHeader[c], currentX + (colWidths[c] / 2), gridY + 7, { align: 'center' });
                currentX += colWidths[c];
            }
            doc.line(gridX, gridY + rowH, gridX + 277, gridY + rowH);

            for (let r = 1; r <= 10; r++) {
                let yPos = gridY + (r * rowH);
                doc.line(gridX, yPos, gridX + 277, yPos);
                doc.text(rowLabels[r - 1], gridX + 10, yPos + 7, { align: 'center' });

                for (let c = 1; c <= 10; c++) {
                    const posStr = rowLabels[r - 1] + c;
                    const sample = rack ? (rack.samples || []).find(s => s.position === posStr) : null;
                    if (sample) {
                        let cX = gridX + colWidths[0] + ((c - 1) * colWidths[1]);
                        doc.text(sample.sampleId, cX + (colWidths[1] / 2), yPos + 7, { align: 'center' });
                    }
                }
            }

            let footerY = gridY + (rowH * 11) + 4;
            doc.rect(10, footerY, 277, 10);
            doc.line(32, footerY, 32, footerY + 10);
            doc.line(65, footerY, 65, footerY + 10);
            doc.line(125, footerY, 125, footerY + 10);
            doc.line(160, footerY, 160, footerY + 10);
            doc.line(185, footerY, 185, footerY + 10);
            doc.line(215, footerY, 215, footerY + 10);

            doc.text("Stored by", 12, footerY + 6);
            doc.text("Sign:", 34, footerY + 6);
            doc.text("Date & Time:", 67, footerY + 6);
            doc.text("[ ] Fridge  [ ] Freezer", 127, footerY + 6);
            doc.text("Discarded by", 162, footerY + 6);
            doc.text("Sign:", 187, footerY + 6);
            doc.text("Date & Time:", 217, footerY + 6);

            doc.save(`Specimen_Storage_Sheet_${rackId}.pdf`);
        }

        function exportCurrentGridPDF() { if (activeRackId) downloadRackSheetPDF(activeRackId); }
        function generateRackSheetPDF() { if (activeRackId) downloadRackSheetPDF(activeRackId); }

        function exportDataExcelAdvanced() {
            const b = document.getElementById('backupBranchSelect') ? document.getElementById('backupBranchSelect').value : currentBranch;
            const expSamples = document.getElementById('expChkSamples') ? document.getElementById('expChkSamples').checked : true;
            const expRacks = document.getElementById('expChkRacks') ? document.getElementById('expChkRacks').checked : true;
            const expAdmin = document.getElementById('expChkAdmin') ? document.getElementById('expChkAdmin').checked : true;

            if (!expSamples && !expRacks && !expAdmin) {
                showCustomAlert('Export Error', 'Please check at least one category to export.');
                return;
            }

            const wb = XLSX.utils.book_new();

            if (expSamples) {
                let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]').filter(s => s.branch === b);
                let samplesDataForExport = samples.map(s => ({
                    'Sample ID': s.id,
                    'Rack ID': s.rack,
                    'Position': s.position,
                    'Department': s.type,
                    'Branch': s.branch,
                    'Status': s.status,
                    'Entry Date': s.entryDate,
                    'Expiry Date': s.expiryDate
                }));
                const wsSamples = XLSX.utils.json_to_sheet(samplesDataForExport);
                XLSX.utils.book_append_sheet(wb, wsSamples, "Samples");
            }

            if (expRacks) {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch === b);
                let racksDataForExport = racks.map(r => ({
                    'Rack ID': r.id,
                    'Type/Dept': r.type,
                    'Branch': r.branch,
                    'Status': r.status,
                    'Created By': r.createdBy,
                    'Created At': r.createdAt,
                    'Tentative Discard': r.tentativeDiscard,
                    'Total Samples': (r.samples || []).length,
                    'Samples Array JSON': JSON.stringify(r.samples || [])
                }));
                const wsRacks = XLSX.utils.json_to_sheet(racksDataForExport);
                XLSX.utils.book_append_sheet(wb, wsRacks, "Racks");
            }

            if (expAdmin) {
                let adminConfig = [{
                    'Users': JSON.stringify(usersList),
                    'Roles': JSON.stringify(rolesList),
                    'Branches': JSON.stringify(branchesList),
                    'Departments': JSON.stringify(departments),
                    'Lab Info': JSON.stringify(JSON.parse(localStorage.getItem('ssx_lab_info_store') || '{}'))
                }];
                const wsAdmin = XLSX.utils.json_to_sheet(adminConfig);
                XLSX.utils.book_append_sheet(wb, wsAdmin, "System_Config");
            }

            XLSX.writeFile(wb, `SampleStoreX_Backup_${b}_${Date.now()}.xlsx`);
            showCustomAlert('Export Complete', `Excel backup created for branch <b>${b}</b>.`);
        }

        function exportDataJSONAdvanced() {
            const b = document.getElementById('backupBranchSelect') ? document.getElementById('backupBranchSelect').value : currentBranch;
            const expSamples = document.getElementById('expChkSamples') ? document.getElementById('expChkSamples').checked : true;
            const expRacks = document.getElementById('expChkRacks') ? document.getElementById('expChkRacks').checked : true;
            const expAdmin = document.getElementById('expChkAdmin') ? document.getElementById('expChkAdmin').checked : true;

            let dataPayload = { exportBranch: b, exportedAt: new Date().toISOString() };

            if (expSamples) {
                dataPayload.samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]').filter(s => s.branch === b);
            }
            if (expRacks) {
                dataPayload.racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]').filter(r => r.branch === b);
            }
            if (expAdmin) {
                dataPayload.users = usersList;
                dataPayload.roles = rolesList;
                dataPayload.branches = branchesList;
                dataPayload.departments = departments;
                dataPayload.labInfo = JSON.parse(localStorage.getItem('ssx_lab_info_store') || '{}');
            }

            const blob = new Blob([JSON.stringify(dataPayload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `SampleStoreX_Backup_${b}_${Date.now()}.json`; a.click();
            showCustomAlert('Export Complete', `JSON backup created for branch <b>${b}</b>.`);
        }

        function importDataExcelAdvanced(e) {
            const file = e.target.files[0];
            if (!file) return;

            const impSamples = document.getElementById('impChkSamples') ? document.getElementById('impChkSamples').checked : true;
            const impRacks = document.getElementById('impChkRacks') ? document.getElementById('impChkRacks').checked : true;
            const impAdmin = document.getElementById('impChkAdmin') ? document.getElementById('impChkAdmin').checked : false;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });

                    let importedCountSamples = 0;
                    let importedCountRacks = 0;

                    if (impSamples && workbook.SheetNames.includes("Samples")) {
                        const samplesSheet = XLSX.utils.sheet_to_json(workbook.Sheets["Samples"]);
                        let existingSamples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');

                        samplesSheet.forEach(row => {
                            let sId = row['Sample ID'] || row['sampleId'] || row['ID'] || row['id'];
                            let rId = row['Rack ID'] || row['rackId'] || row['Rack'] || row['rack'];
                            let pos = row['Position'] || row['position'] || row['Pos'] || row['pos'];
                            
                            if (sId && rId) {
                                let sampleObj = {
                                    id: String(sId),
                                    rack: String(rId),
                                    position: pos || 'A1',
                                    type: row['Department'] || row['type'] || (String(rId).split('-')[0]) || 'C',
                                    branch: row['Branch'] || row['branch'] || currentBranch,
                                    status: row['Status'] || row['status'] || 'Active',
                                    entryDate: row['Entry Date'] || row['entryDate'] || new Date().toISOString(),
                                    expiryDate: row['Expiry Date'] || row['expiryDate'] || new Date().toISOString()
                                };
                                existingSamples = existingSamples.filter(s => !(s.id === sampleObj.id && s.rack === sampleObj.rack && s.position === sampleObj.position));
                                existingSamples.push(sampleObj);
                                importedCountSamples++;
                            }
                        });
                        localStorage.setItem('ssx_samples', JSON.stringify(existingSamples));
                    }

                    if (impRacks && workbook.SheetNames.includes("Racks")) {
                        const racksSheet = XLSX.utils.sheet_to_json(workbook.Sheets["Racks"]);
                        let existingRacks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');

                        racksSheet.forEach(row => {
                            let rId = row['Rack ID'] || row['rackId'] || row['ID'] || row['id'];
                            if (rId) {
                                let samplesArr = [];
                                if (row['Samples Array JSON']) {
                                    try { samplesArr = JSON.parse(row['Samples Array JSON']); } catch(err){}
                                }
                                let rackObj = {
                                    id: String(rId),
                                    type: row['Type/Dept'] || row['type'] || (String(rId).split('-')[0]) || 'C',
                                    branch: row['Branch'] || row['branch'] || currentBranch,
                                    status: row['Status'] || row['status'] || 'Active',
                                    createdBy: row['Created By'] || row['createdBy'] || currentUser,
                                    createdAt: row['Created At'] || row['createdAt'] || new Date().toISOString(),
                                    tentativeDiscard: row['Tentative Discard'] || row['tentativeDiscard'] || new Date().toISOString(),
                                    samples: samplesArr
                                };
                                existingRacks = existingRacks.filter(r => r.id !== rackObj.id);
                                existingRacks.push(rackObj);
                                importedCountRacks++;
                            }
                        });
                        localStorage.setItem('ssx_racks', JSON.stringify(existingRacks));
                    }

                    if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                    if (typeof window.syncSystemConfigToCloud === 'function') window.syncSystemConfigToCloud();

                    refreshAllUIViews();
                    showCustomAlert('Excel Import Success', `Successfully imported/updated <b>${importedCountSamples}</b> samples and <b>${importedCountRacks}</b> racks.`);
                } catch(err) {
                    showCustomAlert('Import Error', 'Failed to parse Excel file. Please ensure valid format.');
                }
            };
            reader.readAsArrayBuffer(file);
        }

        function importDataJSONAdvanced(e) {
            const file = e.target.files[0];
            if (!file) return;

            const impSamples = document.getElementById('impChkSamples') ? document.getElementById('impChkSamples').checked : true;
            const impRacks = document.getElementById('impChkRacks') ? document.getElementById('impChkRacks').checked : true;
            const impAdmin = document.getElementById('impChkAdmin') ? document.getElementById('impChkAdmin').checked : false;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const parsed = JSON.parse(evt.target.result);

                    if (impSamples && parsed.samples) {
                        let existingSamples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');
                        parsed.samples.forEach(s => {
                            existingSamples = existingSamples.filter(item => !(item.id === s.id && item.rack === s.rack && item.position === s.position));
                            existingSamples.push(s);
                        });
                        localStorage.setItem('ssx_samples', JSON.stringify(existingSamples));
                    }

                    if (impRacks && parsed.racks) {
                        let existingRacks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                        parsed.racks.forEach(r => {
                            existingRacks = existingRacks.filter(item => item.id !== r.id);
                            existingRacks.push(r);
                        });
                        localStorage.setItem('ssx_racks', JSON.stringify(existingRacks));
                    }

                    if (impAdmin) {
                        if (parsed.users) { usersList = parsed.users; localStorage.setItem('ssx_users_list', JSON.stringify(usersList)); }
                        if (parsed.roles) { rolesList = parsed.roles; localStorage.setItem('ssx_roles_list', JSON.stringify(rolesList)); }
                        if (parsed.branches) { branchesList = parsed.branches; localStorage.setItem('ssx_branches_list', JSON.stringify(branchesList)); }
                        if (parsed.departments) { departments = parsed.departments; localStorage.setItem('ssx_departments', JSON.stringify(departments)); }
                        if (parsed.labInfo) { localStorage.setItem('ssx_lab_info_store', JSON.stringify(parsed.labInfo)); }
                    }

                    if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                    if (typeof window.syncSystemConfigToCloud === 'function') window.syncSystemConfigToCloud();

                    refreshAllUIViews();
                    showCustomAlert('JSON Import Success', 'JSON backup file imported and merged successfully.');
                } catch(err) {
                    showCustomAlert('Import Error', 'Invalid JSON backup file.');
                }
            };
            reader.readAsText(file);
        }

        function exportSamplesPDF() {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            doc.text(`Sample Inventory List - ${currentBranch}`, 14, 15);
            doc.setFontSize(10);
            doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
            doc.save(`Samples_Inventory_${currentBranch}.pdf`);
        }

        function toggleSelectAllActiveSamples(m) {
            document.querySelectorAll('.active-sample-checkbox').forEach(cb => cb.checked = m.checked);
        }

        function deleteSelectedActiveSamples() {
            const checked = Array.from(document.querySelectorAll('.active-sample-checkbox:checked')).map(cb => cb.value);
            if (checked.length === 0) return;

            showCustomConfirm('Delete Active Samples', `Remove ${checked.length} selected sample(s)?`, () => {
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                let rack = racks.find(r => r.id === activeRackId);
                let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');

                checked.forEach(val => {
                    const [sId, pos] = val.split('___');
                    if (rack) rack.samples = (rack.samples || []).filter(sp => !(sp.sampleId === sId && sp.position === pos));
                    samples = samples.filter(s => !(s.id === sId && s.rack === activeRackId && s.position === pos));
                });

                localStorage.setItem('ssx_racks', JSON.stringify(racks));
                localStorage.setItem('ssx_samples', JSON.stringify(samples));

                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function toggleSelectAllSamples(m) {
            document.querySelectorAll('.sample-checkbox').forEach(cb => cb.checked = m.checked);
        }

        function deleteSelectedSamples() {
            const checkboxes = document.querySelectorAll('.sample-checkbox:checked');
            if (checkboxes.length === 0) return;

            showCustomConfirm('Delete Samples', `Delete ${checkboxes.length} selected sample(s)?`, () => {
                let samples = JSON.parse(localStorage.getItem('ssx_samples') || '[]');
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');

                checkboxes.forEach(cb => {
                    const val = cb.value;
                    const parts = val.split('___');
                    const sId = parts[0];
                    const rId = parts[1];
                    const pos = parts[2];

                    samples = samples.filter(s => !(s.id === sId && s.rack === rId && s.position === pos));
                    let r = racks.find(x => x.id === rId);
                    if (r && r.samples) {
                        r.samples = r.samples.filter(sp => !(sp.sampleId === sId && sp.position === pos));
                    }
                });

                localStorage.setItem('ssx_samples', JSON.stringify(samples));
                localStorage.setItem('ssx_racks', JSON.stringify(racks));

                if (typeof window.syncDataToCloud === 'function') window.syncDataToCloud();
                refreshAllUIViews();
            });
        }

        function triggerStickerPrintAction(rackId) {
            const targetId = rackId || activeRackId;
            if (!targetId) {
                showCustomAlert('Sticker Print', 'Please select or start an active rack first.');
                return;
            }
            pendingStickerRackId = targetId;
            let previewEnabled = document.getElementById('printerPreviewCheck') ? document.getElementById('printerPreviewCheck').checked : true;

            if (previewEnabled) {
                let box = document.getElementById('stickerPreviewBox');
                let labName = localStorage.getItem(`ssx_lab_name_${currentBranch}`) || `${currentBranch} Laboratory`;
                
                let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
                let rack = racks.find(r => r.id === targetId);
                
                let createDate = rack && rack.createdAt ? new Date(rack.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
                let discardDate = rack && rack.tentativeDiscard ? new Date(rack.tentativeDiscard).toLocaleDateString() : 'N/A';

                box.innerHTML = `
                    <div style="border: 1px dashed #333; padding: 6px; text-align: left; font-size: 10px; font-family: monospace; background: #fff; color: #000; width: 50mm; height: 25mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                        <p style="margin: 0; font-size: 8px;"><b>LAB:</b> ${labName}</p>
                        <p style="margin: 0; font-size: 9px;"><b>RACK:</b> ${targetId}</p>
                        <p style="margin: 0; font-size: 7px;"><b>CR:</b> ${createDate} | <b>DISC:</b> ${discardDate}</p>
                        <div style="text-align:center; font-weight:bold; font-size:10px; letter-spacing: 1px;">|||||| |||||||| ||||</div>
                    </div>
                `;
                document.getElementById('stickerPreviewModal').classList.remove('hidden');
            } else {
                confirmPrintSticker();
            }
        }

        function confirmPrintSticker() {
            document.getElementById('stickerPreviewModal').classList.add('hidden');
            
            let labName = localStorage.getItem(`ssx_lab_name_${currentBranch}`) || `${currentBranch} Laboratory`;
            let racks = JSON.parse(localStorage.getItem('ssx_racks') || '[]');
            let rack = racks.find(r => r.id === pendingStickerRackId);
            
            let createDate = rack && rack.createdAt ? new Date(rack.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
            let discardDate = rack && rack.tentativeDiscard ? new Date(rack.tentativeDiscard).toLocaleDateString() : 'N/A';

            let printWin = window.open('', '_blank', 'width=300,height=250');
            if (printWin) {
                printWin.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <title>Print Sticker - ${pendingStickerRackId}</title>
                        <style>
                            @page {
                                size: 50mm 25mm;
                                margin: 0;
                            }
                            html, body {
                                width: 50mm;
                                height: 25mm;
                                margin: 0;
                                padding: 0;
                                overflow: hidden;
                                font-family: monospace;
                                background: #fff;
                                color: #000;
                            }
                            .sticker-box {
                                width: 50mm;
                                height: 25mm;
                                margin: 0;
                                padding: 2mm;
                                box-sizing: border-box;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                            }
                            p { margin: 0; font-size: 8px; line-height: 1.1; }
                            .barcode { text-align: center; font-size: 10px; font-weight: bold; letter-spacing: 1px; }
                        </style>
                    </head>
                    <body>
                        <div class="sticker-box">
                            <p><b>LAB:</b> ${labName} (${currentBranch})</p>
                            <p><b>RACK:</b> ${pendingStickerRackId}</p>
                            <p><b>CR:</b> ${createDate} | <b>DISC:</b> ${discardDate}</p>
                            <div class="barcode">|||||| |||||||| ||||</div>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(function() { window.close(); }, 500);
                            };
                        <\/script>
                    </body>
                    </html>
                `);
                printWin.document.close();
            } else {
                showCustomAlert('Pop-up Blocked', 'Please allow pop-ups for this browser to enable instant sticker printing window.');
            }

            pendingStickerRackId = null;
        }

        async function testNetlifyFunction() {
            try {
                const response = await fetch('/.netlify/functions/labapi');
                const data = await response.json();
                console.log("Netlify Function Response:", data.message);
            } catch (error) {
                console.error("Error connecting to Netlify Function:", error);
            }
        }

        testNetlifyFunction();