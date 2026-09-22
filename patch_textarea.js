import fs from 'fs';
let content = fs.readFileSync('src/components/Simulator.jsx', 'utf8');

const regex = /<input\s+className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 focus:outline-none placeholder:text-slate-400"\s+placeholder=\{filePreview[^>]+>/s;

const fixInput = `<textarea 
                             className="w-full bg-transparent border-none text-sm text-slate-700 focus:ring-0 focus:outline-none placeholder:text-slate-400 resize-none min-h-[20px] max-h-[120px] py-0 m-0 leading-relaxed custom-scrollbar flex items-center" 
                             rows={1}
                             placeholder={filePreview ? "Añadir un comentario..." : "Escribe un mensaje..."} 
                             value={inputValue}
                             onChange={(e) => {
                                 setInputValue(e.target.value);
                                 e.target.style.height = 'auto';
                                 e.target.style.height = (e.target.scrollHeight) + 'px';
                             }}
                             onKeyDown={(e) => {
                                 if (e.key === 'Enter' && !e.shiftKey) {
                                     e.preventDefault();
                                     handleSend();
                                     e.target.style.height = 'auto';
                                 }
                             }}
                           />`;

if (content.match(regex)) {
    content = content.replace(regex, fixInput);
    fs.writeFileSync('src/components/Simulator.jsx', content);
    console.log("Patched Simulator input to textarea");
} else {
    console.log("Could not find input to patch again");
}
