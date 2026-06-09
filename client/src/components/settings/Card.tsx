export default function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
      {children}
    </div>
  );
}
