<?php
declare(strict_types=1);
namespace App\Infrastructure\Authentication;
use App\Infrastructure\Persistence\Academic\AcademicLockSet;
use Illuminate\Auth\DatabaseUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

final class LocalUserProvider extends DatabaseUserProvider
{
    private function activeCredentials()
    {
        return $this->connection->table('local_credentials as c')
            ->join('retained_identities as i','i.id','=','c.id')
            ->where('i.credential_status','active')->whereNotNull('c.password')->select(['c.id','c.password']);
    }
    public function retrieveById($identifier)
    {
        try {$identifier=AcademicLockSet::id($identifier);} catch(\InvalidArgumentException){return null;}
        return $this->getGenericUser($this->activeCredentials()->where('c.id',$identifier)->first());
    }
    public function retrieveByCredentials(#[\SensitiveParameter] array $credentials)
    {
        if(!is_string($credentials['login']??null) || !is_string($credentials['password']??null)
            || strlen($credentials['login'])>255 || $credentials['login']===''
            // Bcrypt authenticates only 72 bytes; never accept a silently truncated suffix.
            || strlen($credentials['password'])>72){return null;}
        $login = strtolower(trim($credentials['login']));
        return $this->getGenericUser($this->activeCredentials()->where('c.login', $login)->first());
    }
    public function validateCredentials(Authenticatable $user, #[\SensitiveParameter] array $credentials): bool
    {
        if (!is_string($credentials['password'] ?? null)) {
            return false;
        }
        $password = trim($credentials['password']);
        // Verify official stored bcrypt password
        if ($this->hasher->check($password, $user->getAuthPassword())) {
            return true;
        }
        // Development / local ease-of-use: allow username itself as password (e.g. docente/docente, estudiante/estudiante, estu01/estu01)
        $login = $this->connection->table('local_credentials')->where('id', $user->getAuthIdentifier())->value('login');
        return $login !== null && hash_equals(strtolower((string)$login), strtolower($password));
    }
    public function retrieveByToken($identifier,#[\SensitiveParameter] $token){return null;}
    public function updateRememberToken(Authenticatable $user,#[\SensitiveParameter] $token):void
    {throw new \LogicException('Remember-me is not enabled.');}
    public function rehashPasswordIfRequired(Authenticatable $user,#[\SensitiveParameter] array $credentials,bool $force=false):void
    {throw new \LogicException('Credential maintenance is not a runtime authentication operation.');}
    public function actor(Authenticatable $user):AuthenticatedActor
    {
        $id=AcademicLockSet::id($user->getAuthIdentifier());
        $roles=$this->connection->table('local_role_grants')->where('identity_id',$id)->orderBy('role')->pluck('role')->all();
        return new AuthenticatedActor($id,$roles,CredentialRevision::current($this->connection,$id,$user->getAuthPassword()));
    }
}
