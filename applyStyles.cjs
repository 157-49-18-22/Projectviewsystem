const fs = require('fs');
const path = require('path');

const responsiveCSS = `
/* ==========================================================
   GLOBAL MOBILE RESPONSIVENESS INJECTED OVERRIDES
   ========================================================== */
@media screen and (max-width: 768px) {
    /* 1. Grid adjustments */
    .projects-grid, .clients-grid, .invoice-grid, .payment-grid, .review-grid, .agreements-grid {
        grid-template-columns: 1fr !important;
        gap: 1rem !important;
    }
    
    /* 2. Modals and Cards */
    .modal-card, .large-modal, .card, .project-card, .invoice-card, .client-card, .payment-card {
        width: 100% !important;
        min-width: unset !important;
        max-width: 100% !important;
        padding: 1rem !important;
        margin: 0 !important;
        border-radius: 12px !important;
    }
    
    .modal-overlay {
        padding: 10px !important;
        align-items: flex-start !important; /* Allow scrolling from top */
        overflow-y: auto !important;
    }

    .modal-card {
        margin-top: 20px !important;
        margin-bottom: 20px !important;
    }

    /* 3. Header Actions & Buttons */
    .header-actions, .list-actions, .filter-group, .action-group {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.5rem !important;
    }

    .header-actions button, .filter-group button, .btn-primary, .btn-secondary {
        width: 100% !important;
        justify-content: center !important;
    }

    button {
       font-size: 0.95rem !important;
    }

    /* 4. Tables Overflow */
    .table-responsive, table {
        display: block !important;
        width: 100% !important;
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch !important;
        white-space: nowrap !important;
    }

    /* 5. Typography */
    h2 { font-size: 1.5rem !important; }
    h3 { font-size: 1.25rem !important; }
    h4 { font-size: 1.1rem !important; }
    
    /* 6. Form Rows */
    .form-row, .grid-cols-2 {
        grid-template-columns: 1fr !important;
        display: flex !important;
        flex-direction: column !important;
    }

    /* 7. Milestone UI fixes */
    .milestone-item {
        flex-direction: column !important;
        align-items: flex-start !important;
    }
    .milestone-actions {
        width: 100% !important;
        flex-direction: column !important;
    }
    .milestone-actions button {
        width: 100% !important;
    }

    /* 8. Fix spacing */
    .detail-section { padding: 1rem !important; }
    .project-meta, .client-meta { flex-direction: column !important; gap: 0.5rem !important; }
    
    /* 9. Layout Adjustments */
    .module-content {
        padding: 0 !important;
    }
}
`;

const filesToUpdate = [
    'src/pages/projects/ProjectDashboard.css',
    'src/pages/admin/ClientManagement.css', 
    'src/pages/agreements/AgreementViewer.css',
    'src/pages/invoices/InvoiceModule.css',
    'src/pages/payments/PaymentModule.css',
    'src/pages/reviews/ReviewModule.css',
    'src/styles/index.css'
];

filesToUpdate.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        // Read file contents
        let content = fs.readFileSync(filePath, 'utf8');
        // Prevent duplicate injections
        if (!content.includes('GLOBAL MOBILE RESPONSIVENESS INJECTED OVERRIDES')) {
            fs.appendFileSync(filePath, '\n' + responsiveCSS);
            console.log(`Updated ${file}`);
        } else {
            console.log(`Already updated ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
