"use client";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";

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

  const convertBytes = (bytes: number) => {
    const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let unitIndex = 0;
    while (bytes >= 1024 && unitIndex < units.length - 1) {
      bytes /= 1024;
      unitIndex++;
    }
    return `${bytes.toFixed(2)} ${units[unitIndex]}`;
  };

  const getTotalBytes = useMemo(() => {
    return files.reduce((sum, file) => sum + file.size, 0);
  }, [files]);

  const validationFileProgress = useMemo(() => {
    if (files.length === 0) {
      return true;
    }

    if (progress.length) {
      const validationProcessActive = progress.filter(
        (item) => item.percentage < 100
      );
      return validationProcessActive?.length > 0;
    }
    return false;
  }, [progress, files]);

  const removedFiles = () => {
    setFiles([]);
    setProgress([]);
  };

  return (
    <>
      <section
        {...getRootProps({ className: "dropzone" })}
        className="h-[200px] w-[100%] flex items-center justify-center bg-gray-100 rounded-lg text-black"
      >
        <div className="h-[100%] w-[100%] flex items-center justify-center">
          <input {...getInputProps()} />
          <p className="text-center m-1]">
            Arraste ou clique aqui para enviar seus arquivos
          </p>
        </div>
      </section>
      <aside className="h-[400px] w-[100%] mt-4 flex flex-col gap-[10px]">
        <p>
          Arquivos: {files.length} | {convertBytes(getTotalBytes)}
        </p>
        <ul className=" max-h-[100%] w-[100%] flex flex-col items-start justify-start overflow-auto scroll-smooth">
          {files.map((file) => {
            const fileProgress = progress.find(
              (item) => item.fileName === file.name
            );
            return (
              <li key={file.path} className="w-[100%]">
                {file.name} - {convertBytes(file.size)} -{" "}
                {fileProgress ? fileProgress.percentage : 0}%
              </li>
            );
          })}
        </ul>
      </aside>

      <div className="flex gap-[10px]">
        <button
          type="button"
          disabled={validationFileProgress}
          className={`${
            validationFileProgress
              ? "bg-disabled-button-rgba hover:none cursor-auto"
              : "bg-blue-500 hover:bg-blue-700 cursor-pointer"
          } text-white font-bold py-2 px-4 rounded mt-4`}
          onClick={sendFiles}
        >
          Enviar Arquivos
        </button>
        {files.length > 0 && (
          <button
            type="button"
            disabled={validationFileProgress}
            className={`${
              validationFileProgress
                ? "bg-disabled-button-rgba hover:none cursor-auto text-white"
                : "bg-white cursor-pointer text-black"
            } font-bold py-2 px-4 rounded mt-4`}
            onClick={removedFiles}
          >
            Remover Arquivos
          </button>
        )}
      </div>
    </>
  );
}
