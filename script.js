document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const addItemButton = document.getElementById('addItem');
    const reportItems = document.getElementById('reportItems');
    const itemCounter = document.getElementById('itemCounter');
    const previewButton = document.getElementById('previewReport');
    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    const closeModal = document.querySelector('.close');

    let itemCount = 0;

    function updateItemCounter() {
        itemCounter.textContent = `Items: ${itemCount} / 20`;
    }

    function addReportItem() {
        if (itemCount >= 20) {
            alert('Maximum of 20 items allowed.');
            return;
        }

        const item = document.createElement('div');
        item.className = 'report-item';
        item.innerHTML = `
            <input type="text" name="keyword${itemCount}" placeholder="Enter keyword">
            <input type="file" name="file${itemCount}" accept="image/*">
            <textarea name="comment${itemCount}" placeholder="Enter comment"></textarea>
            ${itemCount > 0 ? '<button type="button" class="btn secondary remove-item">Remove</button>' : ''}
        `;
        reportItems.appendChild(item);

        itemCount++;
        updateItemCounter();

        if (itemCount === 20) {
            addItemButton.style.display = 'none';
        }
    }

    addItemButton.addEventListener('click', addReportItem);

    reportItems.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item')) {
            e.target.parentElement.remove();
            itemCount--;
            updateItemCounter();
            addItemButton.style.display = 'inline-block';
        }
    });

    // Add initial item
    addReportItem();

    previewButton.addEventListener('click', generatePreview);
    closeModal.addEventListener('click', () => previewModal.style.display = 'none');

    function generatePreview() {
        const formData = new FormData(form);
        const memo = formData.get('memo');
        const timestamp = new Date().toLocaleString();

        let previewHTML = `
            <h2>Report Preview</h2>
            <p>Generated on: ${timestamp}</p>
        `;

        for (let i = 0; i < itemCount; i++) {
            const keyword = formData.get(`keyword${i}`);
            const file = formData.get(`file${i}`);
            const comment = formData.get(`comment${i}`);

            previewHTML += `<div class="preview-item">`;
            previewHTML += `<h3>Keyword: ${keyword}</h3>`;
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function(event) {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.maxWidth = '100%';
                    document.querySelector(`#previewItem${i}`).appendChild(img);
                };
                reader.readAsDataURL(file);
                previewHTML += `<div id="previewItem${i}"></div>`;
            }
            if (comment) {
                previewHTML += `<p>Comment: ${comment}</p>`;
            }
            previewHTML += `</div>`;
        }

        if (memo) {
            previewHTML += `
                <h3>Additional Notes:</h3>
                <p>${memo}</p>
            `;
        }

        previewContent.innerHTML = previewHTML;
        previewModal.style.display = 'block';
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const memo = formData.get('memo');
        const timestamp = new Date().toLocaleString();

        // Create PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let yOffset = 20;
        let pageNumber = 1;

        // Define colors
        const primaryColor = [0, 128, 128]; // Teal
        const secondaryColor = [128, 128, 128]; // Gray

        function addPageNumber() {
            doc.setFontSize(10);
            doc.setTextColor(...secondaryColor);
            doc.text(`Page ${pageNumber}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, null, null, 'right');
        }

        function addHeader() {
            doc.setFontSize(24);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text('Client Report', doc.internal.pageSize.width / 2, yOffset, null, null, 'center');
            yOffset += 15;

            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...secondaryColor);
            doc.text(`Generated on: ${timestamp}`, doc.internal.pageSize.width / 2, yOffset, null, null, 'center');
            yOffset += 20;

            // Add a horizontal line
            doc.setDrawColor(...primaryColor);
            doc.setLineWidth(0.5);
            doc.line(20, yOffset, doc.internal.pageSize.width - 20, yOffset);
            yOffset += 10;
        }

        addHeader();
        addPageNumber();

        for (let i = 0; i < itemCount; i++) {
            const keyword = formData.get(`keyword${i}`);
            const file = formData.get(`file${i}`);
            const comment = formData.get(`comment${i}`);

            if (yOffset > doc.internal.pageSize.height - 40) {
                doc.addPage();
                yOffset = 20;
                pageNumber++;
                addHeader();
                addPageNumber();
            }

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text(`Keyword: ${keyword}`, 20, yOffset);
            yOffset += 10;

            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = function() {
                        const aspectRatio = img.width / img.height;
                        const maxWidth = doc.internal.pageSize.width - 40;
                        const imgWidth = Math.min(img.width, maxWidth);
                        const imgHeight = imgWidth / aspectRatio;

                        if (yOffset + imgHeight > doc.internal.pageSize.height - 40) {
                            doc.addPage();
                            yOffset = 20;
                            pageNumber++;
                            addHeader();
                            addPageNumber();
                        }

                        doc.addImage(event.target.result, 'JPEG', 20, yOffset, imgWidth, imgHeight, null, 'FAST');
                        yOffset += imgHeight + 10;

                        if (comment) {
                            doc.setFontSize(12);
                            doc.setFont('helvetica', 'normal');
                            doc.setTextColor(...secondaryColor);
                            const splitComment = doc.splitTextToSize(`Comment: ${comment}`, doc.internal.pageSize.width - 40);
                            doc.text(splitComment, 20, yOffset);
                            yOffset += (splitComment.length * 7) + 15;
                        }
                    };
                };
                reader.readAsDataURL(file);
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait for image to be added
            } else if (comment) {
                doc.setFontSize(12);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...secondaryColor);
                const splitComment = doc.splitTextToSize(`Comment: ${comment}`, doc.internal.pageSize.width - 40);
                doc.text(splitComment, 20, yOffset);
                yOffset += (splitComment.length * 7) + 15;
            }

            // Add a separator line
            doc.setDrawColor(...secondaryColor);
            doc.setLineWidth(0.2);
            doc.line(20, yOffset - 5, doc.internal.pageSize.width - 20, yOffset - 5);
            yOffset += 10;
        }

        if (memo) {
            if (yOffset > doc.internal.pageSize.height - 60) {
                doc.addPage();
                yOffset = 20;
                pageNumber++;
                addHeader();
                addPageNumber();
            }
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text('Additional Notes:', 20, yOffset);
            yOffset += 10;
            doc.setFontSize(12);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...secondaryColor);
            const splitMemo = doc.splitTextToSize(memo, doc.internal.pageSize.width - 40);
            doc.text(splitMemo, 20, yOffset);
        }

        // Save the PDF
        doc.save('client_report.pdf');
    });
});
