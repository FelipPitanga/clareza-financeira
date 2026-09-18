import FinanceApp from './finance-app';
import {requireClarezaUser} from './auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await requireClarezaUser('/');return <FinanceApp name={user.fullName?.split(' ')[0]||'Felipe'}/>}
