"use client";

import { Icon } from "@iconify/react";

const TECHNOLOGIES = [
  { icon: "simple-icons:postgresql", label: "PostgreSQL" },
  { icon: "simple-icons:apachekafka", label: "Kafka" },
  { icon: "simple-icons:redis", label: "Redis" },
  { icon: "simple-icons:kubernetes", label: "Kubernetes" },
  { icon: "simple-icons:docker", label: "Docker" },
  { icon: "simple-icons:nginx", label: "NGINX" },
  { icon: "simple-icons:rabbitmq", label: "RabbitMQ" },
  { icon: "simple-icons:elasticsearch", label: "Elasticsearch" },
  { icon: "simple-icons:mongodb", label: "MongoDB" },
  { icon: "simple-icons:terraform", label: "Terraform" },
  { icon: "simple-icons:googlecloud", label: "Google Cloud" },
  { icon: "simple-icons:prometheus", label: "Prometheus" },
  { icon: "simple-icons:grafana", label: "Grafana" },
  { icon: "simple-icons:nodedotjs", label: "Node.js" },
  { icon: "simple-icons:go", label: "Go" },
];

export function TechStrip() {
  return (
    <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="landing-marquee flex w-max gap-10">
        {[...TECHNOLOGIES, ...TECHNOLOGIES].map((tech, index) => (
          <div
            key={`${tech.label}-${index}`}
            aria-hidden={index >= TECHNOLOGIES.length}
            className="flex items-center gap-2.5 text-sm whitespace-nowrap text-zinc-500 transition-colors hover:text-zinc-200"
          >
            <Icon icon={tech.icon} className="size-5" />
            {tech.label}
          </div>
        ))}
      </div>
    </div>
  );
}
