// JavaScript for Freelancer Registration Page

// File Upload Handling
const cvInput = document.getElementById('cv');
const cvName = document.getElementById('cvName');
const workSamplesInput = document.getElementById('work-samples');
const workSamplesName = document.getElementById('workSamplesName');
const workSamplesPreview = document.getElementById('workSamplesPreview');

cvInput.addEventListener('change', function () {
    if (cvInput.files.length > 0) {
        cvName.textContent = cvInput.files[0].name;
    } else {
        cvName.textContent = 'No file chosen';
    }
});

workSamplesInput.addEventListener('change', function () {
    if (workSamplesInput.files.length > 0) {
        workSamplesName.textContent = workSamplesInput.files[0].name;

        // Show preview for image files
        const file = workSamplesInput.files[0];
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function (e) {
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

// Form Submission Handling
const freelancerForm = document.getElementById('freelancerForm');

freelancerForm.addEventListener('submit', function (e) {
    e.preventDefault(); // Prevent actual form submission for demonstration

    // Get form values
    const profession = document.getElementById('profession').value;
    const address = document.getElementById('address').value;
    const cv = cvInput.files[0];
    const workSamples = workSamplesInput.files[0];
    const age = document.getElementById('age').value;

    // Log form data to the console (for demonstration)
    console.log('Profession:', profession);
    console.log('Address:', address);
    console.log('CV:', cv ? cv.name : 'No CV uploaded');
    console.log('Samples of Work:', workSamples ? workSamples.name : 'No work samples uploaded');
    console.log('Age:', age);

    // Show success message
    alert('Freelancer registration submitted successfully!');
});