document.addEventListener('DOMContentLoaded', () => {
    // Get URL parameters for filter and source
    const urlParams = new URLSearchParams(window.location.search);
    const filterDays = urlParams.get('days');
    const source = urlParams.get('source');
    
    // Construct API URL
    let apiUrl = '/api/movements/history';
    if (filterDays !== null && filterDays !== '') {
        apiUrl += `?days=${filterDays}`;
    }

    fetch(apiUrl)
        .then(res => res.json())
        .then(data => {
            const listContainer = document.getElementById('history-list');
            if (data.success) {
                listContainer.innerHTML = '';
                
                if (data.history.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; margin-top: 30px; color: #666; font-family: sans-serif;">No hay movimientos para el filtro seleccionado.</div>';
                    return;
                }
                
                data.history.forEach(group => {
                    const monthDiv = document.createElement('div');
                    monthDiv.className = 'month-header';
                    monthDiv.textContent = group.month_year;
                    listContainer.appendChild(monthDiv);
                    
                    group.movements.forEach(m => {
                        const item = document.createElement('div');
                        item.className = 'movement-item';
                        item.onclick = () => {
                            if (source === 'perfil') {
                                window.location.href = `/yapear/exito_edit/${m.num_operacion}`;
                            } else {
                                window.location.href = `/yapear/exito/${m.num_operacion}`;
                            }
                        };
                        
                        const amountClass = m.is_negative ? 'negative' : 'positive';
                        const sign = m.is_negative ? '- ' : '';
                        const amountStr = parseFloat(m.amount).toFixed(2);
                        
                        item.innerHTML = `
                            <div class="movement-info">
                                <div class="movement-title">${m.title}</div>
                                <div class="movement-date">${m.date}</div>
                            </div>
                            <div class="movement-amount ${amountClass}">
                                ${sign}${m.currency} ${amountStr}
                            </div>
                        `;
                        listContainer.appendChild(item);
                    });
                });
            } else {
                listContainer.innerHTML = `<div style="text-align: center; margin-top: 30px; color: #e91e63; font-family: sans-serif;">Error: ${data.message}</div>`;
            }
        })
        .catch(err => {
            console.error('Error loading history:', err);
            document.getElementById('history-list').innerHTML = `<div style="text-align: center; margin-top: 30px; color: #e91e63; font-family: sans-serif;">Error de conexión.</div>`;
        });
    // Filter Dropdown Logic
    const filterIcon = document.getElementById('filter-icon');
    const filterDropdown = document.getElementById('filter-dropdown');
    const filterOptions = document.querySelectorAll('.filter-options li');

    // Toggle dropdown
    filterIcon.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevents document click from immediately closing it
        filterDropdown.classList.toggle('show');
    });

    // Hide dropdown when clicking anywhere else on the document
    document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && e.target !== filterIcon) {
            filterDropdown.classList.remove('show');
        }
    });

    // Apply filter on selection
    filterOptions.forEach(option => {
        // Mark active if matches current URL
        const optDays = option.getAttribute('data-days');
        if (filterDays === optDays) {
            option.classList.add('active');
        }

        option.addEventListener('click', () => {
            const days = option.getAttribute('data-days');
            
            // Reconstruct URL preserving source parameter if it exists
            const url = new URL('/movimientos', window.location.origin);
            if (days !== '') url.searchParams.set('days', days);
            if (source) url.searchParams.set('source', source);
            
            window.location.href = url.pathname + url.search;
        });
    });
});
