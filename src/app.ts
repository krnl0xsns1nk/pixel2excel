import $ from './lib.js'
const cnvBtn = $.qs('#cnvBtn') as HTMLElement;
const output = $.id('output') as HTMLElement;
cnvBtn.addEventListener('click', handleFileSelect)
async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files? target.files[0] : null;
        if (!file) return;
        output.innerHTML = "Processing...";
             try {
                    const worker = await Tesseract.createWorker("eng");
               
             const { data: { text } } = await worker.recognize(file);
               
                    output.innerHTML = `<pre>${text}</pre>`;
               
                    await worker.terminate();
                  } catch (err) {
                         console.error(err);
                         output.innerHTML = "Error: " + err;
                       }
           }
alert("hello world")
