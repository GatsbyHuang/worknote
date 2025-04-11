
  const dbInput = document.getElementById('dbFileInput');
  const analyzeBtn = document.getElementById('analyzeBtn');
  const resultBox = document.getElementById('analysisResult');
  const noteCountEl = document.getElementById('noteCount');
  const categoryCountEl = document.getElementById('categoryCount');
  const conflictCountEl = document.getElementById('conflictCount');

  dbInput.addEventListener('change', () => {
    analyzeBtn.disabled = !dbInput.files.length;
  });

  analyzeBtn.addEventListener('click', async () => {
    const file = dbInput.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('dbfile', file);

    try {
      const res = await fetch('/api/import/analyze', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      noteCountEl.textContent = data.note_count ?? '-';
      categoryCountEl.textContent = data.category_count ?? '-';
      conflictCountEl.textContent = data.conflict_count ?? '0';

      resultBox.classList.remove('hidden');
    } catch (err) {
      alert('❌ Failed to analyze the file.');
      console.error(err);
    }
  });


	mergeBtn.addEventListener('click', async () => {
	  const file = dbInput.files[0];
	  if (!file) {
		alert('❌ Please select a file first.');
		return;
	  }

	  const strategy = document.querySelector('input[name="conflictStrategy"]:checked')?.value || 'ignore';

	  const formData = new FormData();
	  formData.append('dbfile', file);
	  formData.append('strategy', strategy);

	  try {
		const res = await fetch('/api/import/merge', {
		  method: 'POST',
		  body: formData
		});

		if (!res.ok) throw new Error('Server error');

		const result = await res.json();
		alert(`✅ Merge completed: ${result.notes_merged || 0} notes, ${result.categories_merged || 0} categories.`);
	  } catch (err) {
		alert('❌ Merge failed.');
		console.error(err);
	  }
	});
