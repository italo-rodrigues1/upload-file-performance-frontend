"use client";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import Resumable from "resumablejs";

interface IFile {
  path: string;
  lastModified: number;
  lastModifiedDate: Date;
  name: string;
  size: number;
  type: string;
  webkitRelativePath: any;
}

interface IProgress {
  fileName: string;
  percentage: number;
}

export default function InputFiles() {
  const [files, setFiles] = useState<IFile[]>([]);
  const [progress, setProgress] = useState<IProgress[]>([]);
  const { getRootProps, getInputProps } = useDropzone({
    onDrop(acceptedFiles) {
      acceptedFiles.forEach((file) => {
        setFiles((prevFiles) => [...prevFiles, file as unknown as IFile]);
      });
    },
    multiple: true,
  });

  const sendFiles = () => {
    if (files.length === 0) {
      alert("Nenhum arquivo foi selecionado!");
      return;
    }

    files.forEach((file) => {
      const chunkSize = 2 * 1024 * 1024; // 2MB
      const worker = new Worker("/workers/uploadWorker.js"); // Caminho relativo na pasta `public`

      const fileData = {
        name: file.name,
        type: file.type,
        lastModified: file.lastModified,
        content: file,
      };

      worker.postMessage({
        fileData,
        chunkSize,
        url: "http://localhost:3001/uploads",
      });

      worker.onmessage = (event) => {
        const { progress, completed, error } = event.data;

        if (progress !== undefined) {
          setProgress((prevProgress) =>
            prevProgress.map((item) =>
              item.fileName === file.name
                ? { ...item, percentage: progress }
                : item
            )
          );
        }

        if (error) {
          console.error(error);
        }

        if (completed) {
          console.log(`Upload de ${file.name} concluído.`);
          worker.terminate();
        }
      };

      setProgress((prevProgress) => [
        ...prevProgress,
        { fileName: file.name, percentage: 0 },
      ]);
    });
  };

  return (
    <>
      <section
        {...getRootProps({ className: "dropzone" })}
        className="h-[200px] w-[100%] flex items-center justify-center bg-gray-100 rounded-lg text-black"
      >
        <div className="h-[100%] w-[100%] flex items-center justify-center">
          <input {...getInputProps()} />
          <p>Arraste ou clique aqui para enviar seus arquivos</p>
        </div>
      </section>
      <aside className="h-[200px] w-[100%] mt-4">
        <h4>Arquivos:</h4>
        <ul className="w-[100%] flex flex-col items-start justify-start">
          {files.map((file) => {
            const fileProgress = progress.find(
              (item) => item.fileName === file.name
            );
            return (
              <li key={file.path} className="w-[100%]">
                {file.name} - {file.size} bytes -{" "}
                {fileProgress ? fileProgress.percentage : 0}%
              </li>
            );
          })}
        </ul>
      </aside>

      <button
        type="button"
        disabled={files.length === 0}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mt-4"
        onClick={sendFiles}
      >
        Enviar arquivos
      </button>
    </>
  );
}
