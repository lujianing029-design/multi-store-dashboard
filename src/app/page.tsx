const readinessItems = [
  "Next.js App Router",
  "TypeScript strict mode",
  "Tailwind CSS",
  "ESLint",
  "Prisma client wiring"
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <section className="space-y-8">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Phase 1
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-slate-950 sm:text-5xl">
            Multi Store Dashboard 工程初始化完成
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-slate-600">
            这是多平台电商经营数据系统的基础工程。后续阶段会继续加入数据模型、Mock
            Adapter、同步任务和经营看板。
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readinessItems.map((item) => (
            <div
              className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
              key={item}
            >
              {item}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
