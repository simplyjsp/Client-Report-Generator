document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reportForm');
    const addItemButton = document.getElementById('addItem');
    const reportItems = document.getElementById('reportItems');
    const itemCounter = document.getElementById('itemCounter');

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
            <input type="text" name="comment${itemCount}" placeholder="Enter comment">
            <input type="file" name="file${itemCount}" accept="image/*">
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

        function addPageNumber() {
            doc.setFontSize(10);
            doc.text(`Page ${pageNumber}`, 190, 280, null, null, 'right');
        }

        function addHeader() {
            doc.setFontSize(18);
            doc.text('Report', 105, yOffset, null, null, 'center');
            yOffset += 10;

            doc.setFontSize(12);
            doc.text(`Generated on: ${timestamp}`, 20, yOffset);
            yOffset += 20;
        }

        addHeader();
        addPageNumber();

        for (let i = 0; i < itemCount; i++) {
            const comment = formData.get(`comment${i}`);
            const file = formData.get(`file${i}`);

            if (yOffset > 250) {
                doc.addPage();
                yOffset = 20;
                pageNumber++;
                addHeader();
                addPageNumber();
            }

            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = function() {
                        const aspectRatio = img.width / img.height;
                        const maxWidth = 170;
                        const imgWidth = Math.min(img.width, maxWidth);
                        const imgHeight = imgWidth / aspectRatio;

                        if (yOffset + imgHeight > 250) {
                            doc.addPage();
                            yOffset = 20;
                            pageNumber++;
                            addPageNumber();
                        }

                        doc.addImage(event.target.result, 'JPEG', 20, yOffset, imgWidth, imgHeight, null, 'FAST');
                        yOffset += imgHeight + 5;

                        if (comment) {
                            doc.setFontSize(10);
                            const splitComment = doc.splitTextToSize(comment, 170);
                            doc.text(splitComment, 20, yOffset);
                            yOffset += (splitComment.length * 5) + 10;
                        }
                    };
                };
                reader.readAsDataURL(file);
                await new Promise(resolve => setTimeout(resolve, 100)); // Wait for image to be added
            } else if (comment) {
                doc.setFontSize(12);
                const splitComment = doc.splitTextToSize(`Item ${i + 1}: ${comment}`, 170);
                doc.text(splitComment, 20, yOffset);
                yOffset += (splitComment.length * 7) + 10;
            }
        }

        if (memo) {
            if (yOffset > 220) {
                doc.addPage();
                yOffset = 20;
                pageNumber++;
                addPageNumber();
            }
            doc.setFontSize(14);
            doc.text('Additional Notes:', 20, yOffset);
            yOffset += 10;
            doc.setFontSize(12);
            const splitMemo = doc.splitTextToSize(memo, 170);
            doc.text(splitMemo, 20, yOffset);
        }

        // Save the PDF
        doc.save('report.pdf');
    });
});
