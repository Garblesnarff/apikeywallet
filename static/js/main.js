// Safe DOM element selector function
function safeQuerySelector(selector) {
    try {
        return document.querySelector(selector);
    } catch (error) {
        console.error(`Error querying selector "${selector}":`, error);
        return null;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // FAQ functionality
    try {
        const faqQuestions = document.querySelectorAll('.faq-question');
        
        faqQuestions.forEach(question => {
            question.addEventListener('click', () => {
                const answer = question.nextElementSibling;
                if (answer && answer.classList.contains('faq-answer')) {
                    if (answer.style.display === 'block') {
                        answer.style.display = 'none';
                        question.classList.remove('active');
                    } else {
                        answer.style.display = 'block';
                        question.classList.add('active');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Error in FAQ functionality:', error);
    }

    // API Key management functions
    function setupAPIKeyManagement() {
        const toggleButtons = document.querySelectorAll('.toggle-visibility-btn');
        const copyButtons = document.querySelectorAll('.copy-btn');
        const deleteButtons = document.querySelectorAll('.delete-btn');
        const editButtons = document.querySelectorAll('.edit-btn');
        const categorySelects = document.querySelectorAll('.category-select');

        toggleButtons.forEach(btn => btn.addEventListener('click', toggleKeyVisibility));
        copyButtons.forEach(btn => btn.addEventListener('click', copyAPIKey));
        deleteButtons.forEach(btn => btn.addEventListener('click', deleteAPIKey));
        editButtons.forEach(btn => btn.addEventListener('click', editAPIKey));
        categorySelects.forEach(select => select.addEventListener('change', updateKeyCategory));
    }

    // Call the setup function when the DOM is loaded
    setupAPIKeyManagement();

    // Function definitions for API Key management
    function toggleKeyVisibility(event) {
        const keyId = event.target.dataset.keyId;
        const maskedKeyElement = event.target.closest('.api-key').querySelector('.masked-key');
        
        if (maskedKeyElement) {
            if (maskedKeyElement.textContent === '••••••••••••••••') {
                fetch(`/get_key/${keyId}`, { method: 'POST' })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        return response.json();
                    })
                    .then(data => {
                        if (data.key) {
                            maskedKeyElement.textContent = data.key;
                            event.target.innerHTML = '<i class="fas fa-eye-slash"></i>';
                        }
                    })
                    .catch(error => {
                        console.error('Error fetching API key:', error);
                        alert('Failed to retrieve API key. Please try again.');
                    });
            } else {
                maskedKeyElement.textContent = '••••••••••••••••';
                event.target.innerHTML = '<i class="fas fa-eye"></i>';
            }
        }
    }

    function copyAPIKey(event) {
        const keyId = event.target.dataset.keyId;
        fetch(`/copy_key/${keyId}`, { method: 'POST' })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.key) {
                    navigator.clipboard.writeText(data.key)
                        .then(() => alert('API Key copied to clipboard!'))
                        .catch(err => console.error('Error copying text: ', err));
                }
            })
            .catch(error => {
                console.error('Error copying API key:', error);
                alert('Failed to copy API key. Please try again.');
            });
    }

    function deleteAPIKey(event) {
        const keyId = event.target.dataset.keyId;
        if (confirm('Are you sure you want to delete this API Key?')) {
            fetch(`/delete_key/${keyId}`, { method: 'POST' })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        event.target.closest('.api-key').remove();
                    } else {
                        alert('Failed to delete API Key');
                    }
                })
                .catch(error => {
                    console.error('Error deleting API key:', error);
                    alert('Failed to delete API key. Please try again.');
                });
        }
    }

    function editAPIKey(event) {
        const keyId = event.target.dataset.keyId;
        const keyElement = event.target.closest('.api-key');
        const currentName = keyElement.querySelector('h4').textContent;
        const newName = prompt('Enter new name for the API Key:', currentName);
        
        if (newName && newName !== currentName) {
            fetch(`/edit_key/${keyId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ key_name: newName }),
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    keyElement.querySelector('h4').textContent = data.new_name;
                } else {
                    alert('Failed to update API Key name');
                }
            })
            .catch(error => {
                console.error('Error updating API key name:', error);
                alert('Failed to update API key name. Please try again.');
            });
        }
    }

    function updateKeyCategory(event) {
        const keyId = event.target.dataset.keyId;
        const categoryId = event.target.value;
        
        fetch(`/update_key_category/${keyId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ category_id: categoryId }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Category updated successfully');
            } else {
                alert('Failed to update category');
            }
        })
        .catch(error => {
            console.error('Error updating key category:', error);
            alert('Failed to update key category. Please try again.');
        });
    }

    // Safe DOM access for Add New API Key button
    const addNewApiKeyBtn = safeQuerySelector('#add-new-api-key-btn');
    if (addNewApiKeyBtn) {
        addNewApiKeyBtn.addEventListener('click', handleAddNewApiKey);
    } else {
        console.warn('Add New API Key button not found');
    }

    function handleAddNewApiKey() {
        // Implement the logic for adding a new API key
        console.log('Add New API Key button clicked');
        // You can redirect to the add key page or open a modal here
    }
});
