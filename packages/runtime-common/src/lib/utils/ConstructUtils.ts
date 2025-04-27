import { RootConstruct, Construct } from "constructs";

export function getConstructFromNodePath(root: RootConstruct, destPath: string) {
  let destConstruct: Construct | undefined;
  try {
    // Find the construct in the tree by path
    let current = root;

    // Skip the first '/' in the path
    const pathParts = destPath.split('/').filter(p => p).slice(1);

    // Navigate through the path parts to find the construct
    for (const part of pathParts) {
      current = current.node.findChild(part);
    }

    destConstruct = current;
  } catch (error) {
    throw new Error(`Could not find construct at path ${destPath}: ${error}`);
  }
  return destConstruct;
}