self.onmessage = async (event) => {
  const { fileData, chunkSize, url } = event.data;

  // Reconstruir o arquivo a partir dos dados enviados
  const reconstructedFile = new File([fileData.content], fileData.name, {
    type: fileData.type,
    lastModified: fileData.lastModified,
  });

  const totalChunks = Math.ceil(reconstructedFile.size / chunkSize);
  let currentChunk = 0;

  const sendChunk = async (chunkNumber, chunk) => {
    const formData = new FormData();
    formData.append("file", chunk);
    formData.append("chunkNumber", chunkNumber);
    formData.append("totalChunks", totalChunks);
    formData.append("fileName", reconstructedFile.name);

    try {
      await fetch(url, {
        method: "POST",
        body: formData,
      });
      postMessage({ progress: Math.floor((chunkNumber / totalChunks) * 100) });
    } catch (error) {
      postMessage({ error: `Erro ao enviar o chunk ${chunkNumber}: ${error}` });
    }
  };

  while (currentChunk < totalChunks) {
    const start = currentChunk * chunkSize;
    const end = Math.min(start + chunkSize, reconstructedFile.size);
    const chunk = reconstructedFile.slice(start, end);

    await sendChunk(currentChunk + 1, chunk); // Envia o chunk
    currentChunk++;
  }

  postMessage({ completed: true }); // Indica que o upload foi concluído
};
