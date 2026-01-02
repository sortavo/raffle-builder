import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders, handleCorsPrelight, corsJsonResponse } from "../_shared/cors.ts";
import { verifyPlatformAdmin } from "../_shared/admin-auth.ts";

interface TestResult {
  status: number;
  found: boolean;
  error?: string;
  projectName?: string;
}

interface ListTestResult {
  status: number;
  foundInList: boolean;
  projectCount: number;
  error?: string;
}

interface DiagnosisResult {
  configuredSecrets: {
    hasToken: boolean;
    hasProjectId: boolean;
    hasTeamId: boolean;
    projectId: string;
    teamId: string | null;
  };
  tests: {
    projectWithTeam: TestResult;
    projectWithoutTeam: TestResult;
    listWithTeam: ListTestResult;
    listWithoutTeam: ListTestResult;
  };
  recommendation: string;
}

async function testProjectAccess(
  token: string, 
  projectId: string, 
  teamId: string | null,
  useTeamId: boolean
): Promise<TestResult> {
  const teamQuery = useTeamId && teamId ? `?teamId=${teamId}` : '';
  const url = `https://api.vercel.com/v9/projects/${projectId}${teamQuery}`;
  
  console.log(`[diagnose] Testing: GET ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`[diagnose] ✅ Project found: ${data.name}`);
      return {
        status: response.status,
        found: true,
        projectName: data.name
      };
    } else {
      console.log(`[diagnose] ❌ Project not found: ${data.error?.message}`);
      return {
        status: response.status,
        found: false,
        error: data.error?.message || 'Unknown error'
      };
    }
  } catch (error) {
    console.error(`[diagnose] Network error:`, error);
    return {
      status: 0,
      found: false,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

async function testProjectList(
  token: string,
  projectId: string,
  teamId: string | null,
  useTeamId: boolean
): Promise<ListTestResult> {
  const teamQuery = useTeamId && teamId ? `?teamId=${teamId}&limit=100` : '?limit=100';
  const url = `https://api.vercel.com/v9/projects${teamQuery}`;
  
  console.log(`[diagnose] Testing: GET ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    
    if (response.ok) {
      const projects = data.projects || [];
      const foundProject = projects.find((p: any) => p.id === projectId);
      console.log(`[diagnose] Listed ${projects.length} projects, target ${foundProject ? 'FOUND' : 'NOT FOUND'}`);
      
      // Log first few project IDs for debugging
      if (projects.length > 0) {
        console.log(`[diagnose] Sample project IDs: ${projects.slice(0, 3).map((p: any) => p.id).join(', ')}`);
      }
      
      return {
        status: response.status,
        foundInList: !!foundProject,
        projectCount: projects.length
      };
    } else {
      console.log(`[diagnose] ❌ List failed: ${data.error?.message}`);
      return {
        status: response.status,
        foundInList: false,
        projectCount: 0,
        error: data.error?.message || 'Unknown error'
      };
    }
  } catch (error) {
    console.error(`[diagnose] Network error:`, error);
    return {
      status: 0,
      foundInList: false,
      projectCount: 0,
      error: error instanceof Error ? error.message : 'Network error'
    };
  }
}

function generateRecommendation(tests: DiagnosisResult['tests'], hasTeamId: boolean): string {
  const { projectWithTeam, projectWithoutTeam, listWithTeam, listWithoutTeam } = tests;
  
  // Case 1: Works without teamId but not with teamId
  if (projectWithoutTeam.found && !projectWithTeam.found) {
    return "🎯 SOLUCIÓN: El proyecto está en cuenta PERSONAL, no en team. Elimina el secret VERCEL_TEAM_ID o déjalo vacío.";
  }
  
  // Case 2: Works with teamId but not without
  if (projectWithTeam.found && !projectWithoutTeam.found) {
    return "✅ Configuración correcta: El proyecto está en el team y se accede correctamente con teamId.";
  }
  
  // Case 3: Works both ways
  if (projectWithTeam.found && projectWithoutTeam.found) {
    return "✅ Todo OK: El proyecto es accesible. El problema puede estar en otro lugar (permisos de dominio, etc.)";
  }
  
  // Case 4: Not found anywhere - check lists
  if (!projectWithTeam.found && !projectWithoutTeam.found) {
    if (listWithoutTeam.foundInList) {
      return "⚠️ El proyecto existe en tu cuenta personal pero el token no tiene acceso directo. Regenera el token con scope 'Full Account'.";
    }
    if (listWithTeam.foundInList) {
      return "⚠️ El proyecto existe en el team pero el token no tiene acceso directo. Verifica que el token tenga permisos en ese team.";
    }
    
    // Not found in any list
    if (listWithTeam.projectCount === 0 && listWithoutTeam.projectCount === 0) {
      return "❌ El token no puede acceder a ningún proyecto. Verifica que el token sea válido y tenga los scopes correctos.";
    }
    
    if (hasTeamId && listWithTeam.projectCount === 0 && listWithoutTeam.projectCount > 0) {
      return "🎯 SOLUCIÓN: El token puede ver proyectos personales pero el teamId apunta a un team vacío o inaccesible. Verifica VERCEL_TEAM_ID.";
    }
    
    return `❌ El VERCEL_PROJECT_ID no existe o el token no tiene acceso. Proyectos visibles: ${listWithoutTeam.projectCount} personales, ${listWithTeam.projectCount} en team.`;
  }
  
  return "Estado indeterminado. Revisa los logs para más detalles.";
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPrelight(req);
  }

  console.log('[diagnose-vercel-access] Starting comprehensive diagnosis...');

  try {
    // ==========================================
    // AUTHENTICATION: Require platform admin
    // ==========================================
    const authResult = await verifyPlatformAdmin(req);
    
    if (!authResult.authenticated) {
      console.warn('[diagnose-vercel-access] Unauthenticated request rejected');
      return corsJsonResponse(req, { success: false, error: 'Authentication required' }, 401);
    }
    
    if (!authResult.isPlatformAdmin) {
      console.warn(`[diagnose-vercel-access] Non-admin user rejected: ${authResult.userId}`);
      return corsJsonResponse(req, { success: false, error: 'Platform admin access required' }, 403);
    }
    
    console.log(`[diagnose-vercel-access] Authenticated admin: ${authResult.userId}`);

    const VERCEL_API_TOKEN = Deno.env.get('VERCEL_API_TOKEN');
    const VERCEL_PROJECT_ID = Deno.env.get('VERCEL_PROJECT_ID');
    const VERCEL_TEAM_ID = Deno.env.get('VERCEL_TEAM_ID');

    // Check configured secrets
    const configuredSecrets = {
      hasToken: !!VERCEL_API_TOKEN,
      hasProjectId: !!VERCEL_PROJECT_ID,
      hasTeamId: !!VERCEL_TEAM_ID,
      projectId: VERCEL_PROJECT_ID ? `${VERCEL_PROJECT_ID.substring(0, 8)}...` : 'NOT SET',
      teamId: VERCEL_TEAM_ID ? `${VERCEL_TEAM_ID.substring(0, 10)}...` : null
    };

    console.log('[diagnose] Secrets configured:', configuredSecrets);

    if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) {
      return corsJsonResponse(req, {
        success: true,
        diagnosis: {
          configuredSecrets,
          tests: {},
          recommendation: "❌ Faltan secrets: Configura VERCEL_API_TOKEN y VERCEL_PROJECT_ID"
        }
      });
    }

    // Run all 4 tests
    console.log('[diagnose] Running 4 diagnostic tests...');
    
    const teamIdValue = VERCEL_TEAM_ID || null;
    
    const [projectWithTeam, projectWithoutTeam, listWithTeam, listWithoutTeam] = await Promise.all([
      testProjectAccess(VERCEL_API_TOKEN, VERCEL_PROJECT_ID, teamIdValue, true),
      testProjectAccess(VERCEL_API_TOKEN, VERCEL_PROJECT_ID, teamIdValue, false),
      testProjectList(VERCEL_API_TOKEN, VERCEL_PROJECT_ID, teamIdValue, true),
      testProjectList(VERCEL_API_TOKEN, VERCEL_PROJECT_ID, teamIdValue, false),
    ]);

    const tests = {
      projectWithTeam,
      projectWithoutTeam,
      listWithTeam,
      listWithoutTeam
    };

    console.log('[diagnose] Test results:', JSON.stringify(tests, null, 2));

    const recommendation = generateRecommendation(tests, !!VERCEL_TEAM_ID);
    console.log('[diagnose] Recommendation:', recommendation);

    const diagnosis: DiagnosisResult = {
      configuredSecrets,
      tests,
      recommendation
    };

    return corsJsonResponse(req, { success: true, diagnosis });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[diagnose-vercel-access] Fatal error:', errorMessage);
    return corsJsonResponse(req, { success: false, error: errorMessage }, 500);
  }
});
