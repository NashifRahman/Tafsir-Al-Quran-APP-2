"use client"

import { Calendar, MapPin } from "lucide-react"
import { useEffect, useState } from "react"
import Banner from "../img/Tambahkan judul.png"

export default function Hero() {
  const [currentDate, setCurrentDate] = useState("")

  useEffect(() => {
    const date = new Date()
    const formattedDate = date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    setCurrentDate(formattedDate)
  }, [])

  return (
     <section className="relative overflow-hidden bg-black rounded-3xl text-white shadow-lg mb-10">
      <div className="absolute inset-0">
        <img
          src={Banner}
          alt="Background Al-Quran"
          className="h-full w-full object-cover opacity-90"
        />
      </div>

      <div className="relative z-10 px-4 pt-28 pb-4 md:px-8 md:pt-40 md:pb-8">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold md:text-5xl">Al-Quran dan Arti</h1>
          <p className="mt-3 text-lg text-gray-100">
            Alquran dan Terjemah Standar Indonesia
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 text-sm text-black cursor-default">
              <Calendar size={20} />
              <span>{currentDate || "Memuat..."}</span>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2 text-sm text-black cursor-default">
              <MapPin size={20} />
              <span>LPMQ Kemenag</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
