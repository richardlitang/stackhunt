const ESLINT_EXT = /\.(astro|[cm]?[jt]sx?)$/i;
const LINT_ROOTS = /^(src|scripts|tests|tools)\//;

export function selectLintTargets(changedFiles, existsFn = () => true) {
  return changedFiles.filter(
    (file) => LINT_ROOTS.test(file) && ESLINT_EXT.test(file) && existsFn(file)
  );
}
