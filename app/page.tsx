"use client";
import Header from "@/ui/Header";
import { useMediasoup } from "@/hooks/useMediasoup";
import Footer from "@/ui/Footer";

export default function Home() {
  const {
    status,
    connect,
    publish,
    subscribe,
    localVideoRef,
    remoteVideoRef
  } = useMediasoup();

  return (
    <div className="bg-gray-100 flex flex-col min-h-screen transaction duration-500">
      <Header />
      <div className="flex flex-1 flex-col p-4 gap-4">
        <div className="flex gap-4 items-center">
          <button
            id="btn_connect"
            onClick={connect}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={status.connection === 'Connecting...'}
          >
            Connect
          </button>
          <span>{status.connection}</span>
        </div>

        <fieldset className="border p-4 rounded" disabled={!status.connection}>
          <legend>Publish</legend>
          <div className="flex gap-4 items-center">
            <button
              id="btn_publish"
              onClick={() => publish()}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Publish
            </button>
            <span>{status.publication}</span>
          </div>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="mt-4 w-full max-w-[400px] bg-black"
          />
        </fieldset>

        <fieldset className="border p-4 rounded" disabled={!status.connection}>
          <legend>Subscribe</legend>
          <div className="flex gap-4 items-center">
            <button
              id="btn_subscribe"
              onClick={subscribe}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Subscribe
            </button>
            <span>{status.subscription}</span>
          </div>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="mt-4 w-full max-w-[400px] bg-black"
          />
        </fieldset>
      </div>
      <Footer />
    </div>
  );
}
