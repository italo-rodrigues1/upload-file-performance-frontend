self.onmessage = async (event) => {
  const delay = async (ms) => {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  };

  const { fileData, chunkSize, url } = event.data;
  const MAX_RETRIES = 10;

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

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await delay(1000);

        const response = await fetch(url, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        postMessage({
          progress: Math.floor((chunkNumber / totalChunks) * 100),
          chunk: chunkNumber,
        });

        return true;
      } catch (error) {
        console.log(
          `Tentativa ${attempt} de envio do chunk ${chunkNumber} falhou`
        );

        if (attempt === MAX_RETRIES) {
          postMessage({
            error: `Erro ao enviar o chunk ${chunkNumber} do arquivo ${reconstructedFile.name} após ${MAX_RETRIES} tentativas: ${error}`,
            fileName: reconstructedFile.name,
          });
          return false;
        }
        await delay(2000);
      }
    }
  };

  try {
    while (currentChunk < totalChunks) {
      const start = currentChunk * chunkSize;
      const end = Math.min(start + chunkSize, reconstructedFile.size);
      const chunk = reconstructedFile.slice(start, end);

      const chunkSent = await sendChunk(currentChunk + 1, chunk);

      if (!chunkSent) {
        // Se um chunk falhar, interrompe todo o upload
        throw new Error(`Falha no envio do chunk ${currentChunk + 1}`);
      }

      currentChunk++;
    }

    postMessage({ completed: true }); // Indica que o upload foi concluído
  } catch (error) {
    postMessage({
      error: `Erro no upload: ${error.message}`,
      completed: false,
    });
  }
};
