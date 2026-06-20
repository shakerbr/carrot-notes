import { marked } from 'marked';

marked.setOptions({
  breaks: true,
  gfm: true,
});

export { marked };
