"use client";

export default function LandingHomePage() {
  //

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Hero Section */}
      <section className="mb-12">
        <div className=" rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 sm:p-12 shadow-2xl shadow-blue-500/25 dark:shadow-blue-900/30">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="text-white">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                Welcome!
              </h1>
              <p className="text-white/90 mt-2 text-lg">
                This is the Procurement and Assets Management System for the
                Department of Education - Schools Division of Bayugan City.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
