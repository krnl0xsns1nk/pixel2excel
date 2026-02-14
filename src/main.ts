import Tesseract from 'tesseract.js';

const imageInput = document.getElementById('imageInput') as HTMLInputElement;
const progressDiv = document.getElementById('progress') as HTMLDivElement;
const resultTextarea = document.getElementById('result') as HTMLTextAreaElement;

imageInput.addEventListener('change', async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  
  if (!file) {
    return;
  }

  progressDiv.textContent = 'جاري المعالجة...';
  resultTextarea.value = '';

  try {
    const result = await Tesseract.recognize(
      file,
      'ara+eng',
      {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            const progress = Math.round(m.progress * 100);
            progressDiv.textContent = `جاري التعرف على النص: ${progress}%`;
          }
        }
      }
    );

    resultTextarea.value = result.data.text;
    progressDiv.textContent = 'تم الانتهاء!';
    
  } catch (error) {
    progressDiv.textContent = 'حدث خطأ: ' + (error as Error).message;
    console.error(error);
  }
});
