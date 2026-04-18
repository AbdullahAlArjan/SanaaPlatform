// FreelancerReg.js
document.addEventListener('DOMContentLoaded', () => {
    const freelancerForm = document.getElementById('freelancerForm');
    const cvInput = document.getElementById('cv');
    const workSamplesInput = document.getElementById('work-samples');
    const cvName = document.getElementById('cvName');
    const workSamplesName = document.getElementById('workSamplesName');
    const workSamplesPreview = document.getElementById('workSamplesPreview');

    // Handle file input changes
    cvInput.addEventListener('change', () => {
        if (cvInput.files.length > 0) {
            cvName.textContent = cvInput.files[0].name;
        } else {
            cvName.textContent = 'No file chosen';
        }
    });

    workSamplesInput.addEventListener('change', () => {
        if (workSamplesInput.files.length > 0) {
            workSamplesName.textContent = workSamplesInput.files[0].name;

            // Show preview for image files
            const file = workSamplesInput.files[0];
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    workSamplesPreview.innerHTML = `<img src="${e.target.result}" alt="Work Sample Preview">`;
                };
                reader.readAsDataURL(file);
            } else {
                workSamplesPreview.innerHTML = '';
            }
        } else {
            workSamplesName.textContent = 'No file chosen';
            workSamplesPreview.innerHTML = '';
        }
    });

    // Handle form submission
    freelancerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Get form data
        const profession = document.getElementById('profession').value;
        const address = document.getElementById('address').value;
        const cvFile = cvInput.files[0];
        const workSamplesFile = workSamplesInput.files[0];

        // Store data in local storage
        const freelancerData = {
            profession,
            address,
            cv: cvFile ? cvFile.name : 'No CV uploaded',
            workSamples: workSamplesFile ? workSamplesFile.name : 'No work samples uploaded'
        };
        localStorage.setItem('freelancerData', JSON.stringify(freelancerData));

        // Show success message
        alert('Freelancer registration submitted successfully!');

        // Redirect to freelancer page
        window.location.href = './freelancer/freelancer.html'; // Use a relative path
    });
});