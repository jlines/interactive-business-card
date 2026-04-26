import type { ChatMessage } from '@/types/chat';

type GroundedReplyInput = {
  latestUserMessage: string;
  audienceHint?: string;
};

const serviceHighlights = [
  'custom internal tools',
  'workflow automation',
  'AI-assisted product and operations tooling',
  'web application prototyping and delivery',
  'technical discovery and implementation planning',
];

export function buildGroundedReply({ latestUserMessage, audienceHint }: GroundedReplyInput): string {
  const normalized = latestUserMessage.toLowerCase();
  const highlightedServices = serviceHighlights.filter((service) => {
    if (normalized.includes('workflow') && service === 'workflow automation') return true;
    if ((normalized.includes('intake') || normalized.includes('lead')) && service === 'custom internal tools') return true;
    if ((normalized.includes('ai') || normalized.includes('assistant')) && service === 'AI-assisted product and operations tooling') return true;
    return normalized.includes(service.split(' ')[0] ?? '');
  });

  const servicesToMention = highlightedServices.length > 0
    ? highlightedServices
    : ['workflow automation', 'custom internal tools'];

  const audienceLine = audienceHint
    ? ` Since this entry was aimed at ${audienceHint}, I’d keep the first slice practical and small.`
    : '';

  if (normalized.includes('price') || normalized.includes('pricing') || normalized.includes('rate')) {
    return `I can help qualify fit, but I should stay honest here: this card does not publish fixed pricing.${audienceLine} A better next step is to describe the workflow, bottleneck, or project scope so Jason can judge fit and suggest the right engagement shape.`;
  }

  return `Yes — this looks aligned with Jason’s work, especially ${servicesToMention.join(' and ')}.${audienceLine} The best next step is to describe the workflow, bottleneck, or project outcome you need so the chat can narrow it to the smallest useful slice before a direct conversation.`;
}

export function getLatestUserMessage(messages: ChatMessage[]): string {
  const latest = [...messages].reverse().find((message) => message.role === 'user');
  return latest?.content ?? '';
}
