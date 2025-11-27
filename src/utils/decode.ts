export function decodeHtml(input: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = input;
  return txt.value;
}

export function splitArabicParagraphs(text: string): string {
  if (!text) return "";
  
  let processed = text;

  // 1. Pisahkan Referensi/Teks Arab yang ada di dalam kurung (...)
  // Contoh: (رواه الشيخان) akan dipisah ke baris baru
  const regexParens = /(\([^\)]*[\u0600-\u06FF]+[^\)]*\))/g;
  processed = processed.replace(regexParens, '\n$1\n');

  // 2. Pisahkan Teks Latin yang bertemu langsung dengan Arab
  // Penjelasan Regex:
  // ([a-zA-Z\u00C0-\u024F\.:]+) -> Group 1: Huruf Latin (termasuk aksen seperti ḍ), titik, atau titik dua
  // \s+                         -> Spasi pemisah
  // ([\u0600-\u06FF])           -> Group 2: Huruf Arab pertama yang ditemukan
  
  const regexLatinArab = /([a-zA-Z\u00C0-\u024F\.,():"]+)\s+([\u0600-\u06FF])/g;
  
  // Kita ganti dengan: "Teks Latin" + "Enter 2x" + "Teks Arab"
  processed = processed.replace(regexLatinArab, '$1\n$2');

  const regexNum = /([0-9]+\.)/g;
  processed = processed.replace(regexNum, '\n$1');

  const regexArabLatin = /([\u0600-\u06FF]+)\s+([&“"a-zA-Z\u00C0-\u024F\.,():]+)/g;
  processed = processed.replace(regexArabLatin, '$1\n$2');
  

  return processed;
}