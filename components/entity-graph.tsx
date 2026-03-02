'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import type { ExtractedEntity, CrossReferenceMatch } from '@/types'
import { cn } from '@/lib/utils'

/* ─── Node / Edge types ──────────────────────────────────────────────────── */

interface GraphNode {
  id: string
  label: string
  type: string
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

interface GraphEdge {
  source: string
  target: string
  label: string
}

const TYPE_COLORS: Record<string, string> = {
  PERSON: '#3b82f6',
  LOCATION: '#22c55e',
  ORGANIZATION: '#a855f7',
  DATE: '#eab308',
  INCIDENT: '#ef4444',
  MILITARY_ID: '#f97316',
  SIGINT: '#06b6d4',
  DATABASE: '#581C1C',
}

/* ─── Build graph from entities + cross-ref matches ──────────────────────── */

function buildGraph(
  entities: ExtractedEntity[],
  matches: CrossReferenceMatch[]
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodeMap = new Map<string, GraphNode>()
  const edges: GraphEdge[] = []
  const w = 600, h = 400

  // Add entity nodes
  for (const entity of entities) {
    const key = `${entity.type}::${entity.text}`
    if (!nodeMap.has(key)) {
      nodeMap.set(key, {
        id: key,
        label: entity.text,
        type: entity.type,
        x: Math.random() * (w - 100) + 50,
        y: Math.random() * (h - 100) + 50,
        vx: 0,
        vy: 0,
        radius: entity.evidentiaryWeight === 'HIGH' ? 20 : entity.evidentiaryWeight === 'MEDIUM' ? 15 : 10,
      })
    }
  }

  // Create edges between entities that share context (co-occur in testimony)
  const entityList = [...nodeMap.values()]
  for (let i = 0; i < entityList.length; i++) {
    for (let j = i + 1; j < entityList.length; j++) {
      const a = entities.find(e => `${e.type}::${e.text}` === entityList[i].id)
      const b = entities.find(e => `${e.type}::${e.text}` === entityList[j].id)
      if (a && b && a.context && b.context) {
        // Check if entities share overlapping context or are close in the text
        const aWords = new Set(a.context.toLowerCase().split(/\s+/))
        const bWords = new Set(b.context.toLowerCase().split(/\s+/))
        const overlap = [...aWords].filter(w => bWords.has(w) && w.length > 3).length
        if (overlap >= 2) {
          edges.push({ source: entityList[i].id, target: entityList[j].id, label: 'co-occurs' })
        }
      }
    }
  }

  // Add database match connections
  for (const match of matches) {
    const dbKey = `DATABASE::${match.source}-${match.matchedCaseId}`
    if (!nodeMap.has(dbKey)) {
      nodeMap.set(dbKey, {
        id: dbKey,
        label: `${match.source}: ${match.matchedCaseId}`,
        type: 'DATABASE',
        x: Math.random() * (w - 100) + 50,
        y: Math.random() * (h - 100) + 50,
        vx: 0,
        vy: 0,
        radius: 12,
      })
    }
    // Find entity node
    const entityNode = entityList.find(n => n.label.toLowerCase() === match.entityText.toLowerCase())
    if (entityNode) {
      edges.push({ source: entityNode.id, target: dbKey, label: match.matchType })
    }
  }

  return { nodes: [...nodeMap.values()], edges }
}

/* ─── Simple force-directed layout (runs on canvas for performance) ──────── */

function applyForces(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number) {
  const centerX = w / 2, centerY = h / 2

  // Repulsion between all pairs
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x
      const dy = nodes[j].y - nodes[i].y
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
      const force = 800 / (dist * dist)
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      nodes[i].vx -= fx; nodes[i].vy -= fy
      nodes[j].vx += fx; nodes[j].vy += fy
    }
  }

  // Attraction along edges
  for (const edge of edges) {
    const src = nodes.find(n => n.id === edge.source)
    const tgt = nodes.find(n => n.id === edge.target)
    if (!src || !tgt) continue
    const dx = tgt.x - src.x
    const dy = tgt.y - src.y
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
    const force = (dist - 120) * 0.005
    const fx = (dx / dist) * force
    const fy = (dy / dist) * force
    src.vx += fx; src.vy += fy
    tgt.vx -= fx; tgt.vy -= fy
  }

  // Gravity toward center
  for (const node of nodes) {
    node.vx += (centerX - node.x) * 0.001
    node.vy += (centerY - node.y) * 0.001
  }

  // Apply velocity with damping
  for (const node of nodes) {
    node.vx *= 0.85; node.vy *= 0.85
    node.x += node.vx; node.y += node.vy
    // Bounds
    node.x = Math.max(node.radius, Math.min(w - node.radius, node.x))
    node.y = Math.max(node.radius, Math.min(h - node.radius, node.y))
  }
}

/* ─── Component ──────────────────────────────────────────────────────────── */

interface EntityGraphProps {
  entities: ExtractedEntity[]
  matches: CrossReferenceMatch[]
}

export function EntityGraph({ entities, matches }: EntityGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphRef = useRef<{ nodes: GraphNode[]; edges: GraphEdge[] } | null>(null)
  const animRef = useRef<number>(0)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [isSimulating, setIsSimulating] = useState(true)

  const W = 700, H = 450

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const graph = graphRef.current
    if (!canvas || !ctx || !graph) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.scale(dpr, dpr)

    ctx.clearRect(0, 0, W, H)

    // Draw edges
    for (const edge of graph.edges) {
      const src = graph.nodes.find(n => n.id === edge.source)
      const tgt = graph.nodes.find(n => n.id === edge.target)
      if (!src || !tgt) continue
      ctx.beginPath()
      ctx.moveTo(src.x, src.y)
      ctx.lineTo(tgt.x, tgt.y)
      ctx.strokeStyle = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode)
        ? 'rgba(255,255,255,0.5)'
        : 'rgba(255,255,255,0.1)'
      ctx.lineWidth = hoveredNode && (edge.source === hoveredNode || edge.target === hoveredNode) ? 1.5 : 0.5
      ctx.stroke()
    }

    // Draw nodes
    for (const node of graph.nodes) {
      const color = TYPE_COLORS[node.type] ?? '#888'
      const isHovered = node.id === hoveredNode

      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius + (isHovered ? 3 : 0), 0, Math.PI * 2)
      ctx.fillStyle = isHovered ? color : color + '99'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = isHovered ? 2 : 1
      ctx.stroke()

      // Label
      ctx.font = '10px Inter, sans-serif'
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      const label = node.label.length > 18 ? node.label.slice(0, 16) + '…' : node.label
      ctx.fillText(label, node.x, node.y + node.radius + 14)
    }
  }, [hoveredNode, W, H])

  useEffect(() => {
    graphRef.current = buildGraph(entities, matches)
  }, [entities, matches])

  useEffect(() => {
    if (!isSimulating) return

    let iterations = 0
    const maxIterations = 200

    const tick = () => {
      const graph = graphRef.current
      if (!graph) return
      applyForces(graph.nodes, graph.edges, W, H)
      draw()
      iterations++
      if (iterations < maxIterations) {
        animRef.current = requestAnimationFrame(tick)
      } else {
        setIsSimulating(false)
      }
    }

    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [isSimulating, draw, W, H])

  // Draw once more after simulation stops (for hover updates)
  useEffect(() => {
    if (!isSimulating) draw()
  }, [hoveredNode, isSimulating, draw])

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    const graph = graphRef.current
    if (!canvas || !graph) return
    const rect = canvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) * (W / rect.width)
    const my = (e.clientY - rect.top) * (H / rect.height)

    let found: string | null = null
    for (const node of graph.nodes) {
      const dx = mx - node.x
      const dy = my - node.y
      if (dx * dx + dy * dy <= (node.radius + 5) * (node.radius + 5)) {
        found = node.id
        break
      }
    }
    setHoveredNode(found)
  }, [W, H])

  if (entities.length === 0) {
    return <p className="text-witness-grey text-sm italic">No entities to graph.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-witness-grey uppercase tracking-widest">Entity Network</div>
        <button
          onClick={() => {
            graphRef.current = buildGraph(entities, matches)
            setIsSimulating(true)
          }}
          className="text-[10px] uppercase tracking-wider border border-witness-border text-witness-grey hover:text-white px-2 py-0.5 transition-colors"
        >
          Reset Layout
        </button>
      </div>

      <div className="border border-witness-border bg-[#050810] overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: W, height: H, maxWidth: '100%' }}
          className="cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredNode(null)}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-witness-grey uppercase tracking-wider">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
