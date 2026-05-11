// يمكن إضافة أي ديناميكية إضافية هنا
document.addEventListener('DOMContentLoaded', () => {
    // إضافة تأثير عند النقر
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('mousedown', () => {
            card.style.transform = 'scale(0.98)';
        });
        
        card.addEventListener('mouseup', () => {
            card.style.transform = 'scale(1)';
        });
    });
});