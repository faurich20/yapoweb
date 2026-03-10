document.addEventListener('DOMContentLoaded', () => {
    fetch('/api/movements/history')
        .then(res => res.json())
        .then(data => {
            const listContainer = document.getElementById('history-list');
            if (data.success) {
                listContainer.innerHTML = '';
                
                if (data.history.length === 0) {
                    listContainer.innerHTML = '<div style="text-align: center; margin-top: 30px; color: #666; font-family: sans-serif;">No hay movimientos en los últimos 2 meses.</div>';
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
                        item.onclick = () => window.location.href = `/yapear/exito/${m.num_operacion}`;
                        
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
});
