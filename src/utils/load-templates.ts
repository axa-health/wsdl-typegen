import fs from 'node:fs/promises';
import camelcase from 'camelcase';
import Handlebars from 'handlebars';

type TemplateMap = Record<string, Handlebars.TemplateDelegate>;

export async function loadTemplates(dir: URL): Promise<TemplateMap> {
  const templates: TemplateMap = {};

  const files = await fs.readdir(dir);

  for (const file of files) {
    if (!file.endsWith('.hbs')) continue;

    const name = file.replace(/\.hbs$/, '');
    const source = await fs.readFile(new URL(file, dir), 'utf8');

    const template = Handlebars.compile(source);
    templates[name] = template;

    Handlebars.registerPartial(camelcase(name), template);
  }

  return templates;
}
