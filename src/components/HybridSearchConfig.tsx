// "use client"

// import { useState } from "react"
// import { Card } from "@/components/ui/card"
// import { Button } from "@/components/ui/button"
// import { Label } from "@/components/ui/label"
// import { Slider } from "@/components/ui/slider"
// import { updateHybridSearchConfig, getSearchStats } from "@/services/QuranAPI"

// interface HybridSearchConfigProps {
//   onConfigChange?: (config: any) => void
// }

// export default function HybridSearchConfig({ onConfigChange }: HybridSearchConfigProps) {
//   const stats = getSearchStats()
//   const [bm25Weight, setBm25Weight] = useState(0.5)
//   const [semanticWeight, setSemanticWeight] = useState(0.5)
//   const [minBM25Threshold, setMinBM25Threshold] = useState(0.05)
//   const [minSemanticThreshold, setMinSemanticThreshold] = useState(0.2)
//   const [isExpanded, setIsExpanded] = useState(false)

//   const handleWeightChange = (newBm25: number) => {
//     const newSemantic = 1 - newBm25
//     setBm25Weight(newBm25)
//     setSemanticWeight(newSemantic)
//   }

//   const handleApplyConfig = () => {
//     updateHybridSearchConfig({
//       bm25Weight,
//       semanticWeight,
//       minBM25Threshold,
//       minSemanticThreshold,
//     })

//     onConfigChange?.({
//       bm25Weight,
//       semanticWeight,
//       minBM25Threshold,
//       minSemanticThreshold,
//     })
//   }

//   const handleReset = () => {
//     setBm25Weight(0.5)
//     setSemanticWeight(0.5)
//     setMinBM25Threshold(0.05)
//     setMinSemanticThreshold(0.2)
//   }

//   return (
//     <Card className="p-4">
//       <div className="flex items-center justify-between cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
//         <h3 className="font-semibold text-lg">Konfigurasi Pencarian Hybrid</h3>
//         <span className="text-sm text-gray-500">{isExpanded ? "▼" : "▶"}</span>
//       </div>

//       {isExpanded && (
//         <div className="mt-4 space-y-6">
//           {/* Search Stats */}
//           <div className="bg-blue-50 p-3 rounded border border-blue-200">
//             <p className="text-sm text-gray-700">
//               <span className="font-semibold">Status:</span> {stats.engineInitialized ? "Siap" : "Belum diinisialisasi"}
//             </p>
//             <p className="text-sm text-gray-700">
//               <span className="font-semibold">Total Ayat:</span> {stats.totalVerses}
//             </p>
//           </div>

//           {/* BM25 Weight Slider */}
//           <div>
//             <Label className="text-sm font-semibold mb-2 block">
//               BM25 Weight (Keyword Matching): {(bm25Weight * 100).toFixed(0)}%
//             </Label>
//             <Slider
//               value={[bm25Weight]}
//               onValueChange={(value) => handleWeightChange(value[0])}
//               min={0}
//               max={1}
//               step={0.1}
//               className="w-full"
//             />
//             <p className="text-xs text-gray-500 mt-1">Tinggi = lebih fokus pada kecocokan kata kunci yang tepat</p>
//           </div>

//           {/* Semantic Weight Display */}
//           <div>
//             <Label className="text-sm font-semibold mb-2 block">
//               Semantic Weight (Makna): {(semanticWeight * 100).toFixed(0)}%
//             </Label>
//             <div className="w-full h-2 bg-gray-200 rounded">
//               <div
//                 className="h-full bg-purple-500 rounded transition-all"
//                 style={{ width: `${semanticWeight * 100}%` }}
//               ></div>
//             </div>
//             <p className="text-xs text-gray-500 mt-1">Tinggi = lebih fokus pada kecocokan makna semantik</p>
//           </div>

//           {/* Min BM25 Threshold */}
//           <div>
//             <Label className="text-sm font-semibold mb-2 block">
//               Min BM25 Threshold: {(minBM25Threshold * 100).toFixed(0)}%
//             </Label>
//             <Slider
//               value={[minBM25Threshold]}
//               onValueChange={(value) => setMinBM25Threshold(value[0])}
//               min={0}
//               max={1}
//               step={0.05}
//               className="w-full"
//             />
//             <p className="text-xs text-gray-500 mt-1">Minimum score untuk hasil keyword matching</p>
//           </div>

//           {/* Min Semantic Threshold */}
//           <div>
//             <Label className="text-sm font-semibold mb-2 block">
//               Min Semantic Threshold: {(minSemanticThreshold * 100).toFixed(0)}%
//             </Label>
//             <Slider
//               value={[minSemanticThreshold]}
//               onValueChange={(value) => setMinSemanticThreshold(value[0])}
//               min={0}
//               max={1}
//               step={0.05}
//               className="w-full"
//             />
//             <p className="text-xs text-gray-500 mt-1">Minimum score untuk hasil semantic matching</p>
//           </div>

//           {/* Action Buttons */}
//           <div className="flex gap-2">
//             <Button onClick={handleApplyConfig} className="flex-1 bg-green-600 hover:bg-green-700">
//               Terapkan Konfigurasi
//             </Button>
//             <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent">
//               Reset ke Default
//             </Button>
//           </div>

//           {/* Info Box */}
//           <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-sm text-yellow-800">
//             <p className="font-semibold mb-1">Penjelasan Algoritma:</p>
//             <ul className="list-disc list-inside space-y-1 text-xs">
//               <li>
//                 <strong>BM25:</strong> Algoritma ranking untuk kecocokan kata kunci yang presisi
//               </li>
//               <li>
//                 <strong>Semantic:</strong> Pencarian berdasarkan makna menggunakan Sentence-BERT
//               </li>
//               <li>
//                 <strong>Hybrid:</strong> Kombinasi kedua algoritma untuk hasil yang lebih akurat
//               </li>
//             </ul>
//           </div>
//         </div>
//       )}
//     </Card>
//   )
// }
